// ==========================================
// KANBAN FLOW - Main Application (100% Static Client-Side)
// Persistência via localStorage | GitHub Pages & file:// Ready
// ==========================================

(function (global) {
  const {
    BOARD_COLORS,
    LABEL_COLORS,
    PRIORITY_CONFIG,
    COLUMN_COLORS,
    escapeHtml,
    formatDueDate,
    formatFullDate,
    formatDateShort,
    getDueStatus,
    generateId,
    soundManager,
    triggerConfetti,
    icon,
  } = global.KanbanUtils;

  const dbService = global.KanbanDB;
  const initialData = global.KanbanInitialData;

  class KanbanApp {
    constructor() {
      this.state = {
        isLoading: true,
        boards: [],
        columns: [],
        cards: [],
        labels: [],
        activities: [],
        settings: {
          theme: 'dark',
          activeBoardId: 'board-tcc-inmoov',
          enableSound: true,
          enableConfetti: true,
          compactCards: false,
        },
        viewMode: 'kanban', // 'kanban' | 'list' | 'dashboard' | 'analytics'
        analyticsBoardId: 'all',
        isSidebarOpen: typeof window !== 'undefined' ? window.innerWidth >= 1024 : true,
        filters: {
          search: '',
          priorities: [],
          dueFilter: 'all', // 'all' | 'overdue' | 'today' | 'soon' | 'none'
          sortBy: 'order', // 'order' | 'priority' | 'dueDate' | 'title'
        },
        // UI Popovers & Inline states
        isBoardMenuOpen: false,
        isFilterMenuOpen: false,
        openColumnMenuId: null,
        openCardMenuId: null,
        quickAddColumnId: null,
        editingColumnTitleId: null,
        // Modals
        selectedCardId: null,
        isCreatingLabel: false,
        newLabelColor: 'indigo',
        isAddingLink: false,
        boardModal: { isOpen: false, editingBoardId: null, color: 'indigo' },
        columnModal: { isOpen: false, editingColumnId: null, color: '#6366f1' },
        isGlobalSearchOpen: false,
        globalSearchQuery: '',
        globalSearchIndex: 0,
        isArchiveModalOpen: false,
        archiveTab: 'cards', // 'cards' | 'boards'
        isBackupModalOpen: false,
        importedBackupData: null,
        importMode: 'replace',
        importError: null,
        isShortcutsModalOpen: false,
        confirmDialog: null, // { title, message, confirmText, isDestructive, onConfirm }
        // Drag state
        draggedCardId: null,
        draggedSourceColId: null,
      };

      this.toasts = [];
    }

    async init() {
      try {
        const data = await dbService.initialize(initialData);
        this.state.boards = data.boards;
        this.state.columns = data.columns;
        this.state.cards = data.cards;
        this.state.labels = data.labels;
        this.state.activities = data.activities;
        this.state.settings = data.settings;

        const activeBoard =
          this.state.boards.find((b) => b.id === data.settings.activeBoardId && !b.isArchived) ||
          this.state.boards.find((b) => !b.isArchived) ||
          this.state.boards[0] ||
          null;

        this.state.settings.activeBoardId = activeBoard ? activeBoard.id : null;
        this.state.analyticsBoardId = activeBoard ? activeBoard.id : 'all';
        this.state.isLoading = false;

        this.applyTheme(this.state.settings.theme);
        soundManager.setEnabled(this.state.settings.enableSound);

        this.bindGlobalEvents();
        this.render();
      } catch (err) {
        console.error('Erro na inicialização:', err);
        this.state.isLoading = false;
        this.render();
      }
    }

    // --- THEME ---
    applyTheme(theme) {
      const root = document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }

    async toggleTheme() {
      const next = this.state.settings.theme === 'dark' ? 'light' : 'dark';
      this.state.settings.theme = next;
      this.applyTheme(next);
      await dbService.saveSettings(this.state.settings);
      this.showToast('info', next === 'dark' ? 'Modo Escuro ativado' : 'Modo Claro ativado');
      this.render();
    }

    async updateSettings(partial) {
      this.state.settings = { ...this.state.settings, ...partial };
      if (partial.enableSound !== undefined) {
        soundManager.setEnabled(partial.enableSound);
      }
      if (partial.theme !== undefined) {
        this.applyTheme(partial.theme);
      }
      await dbService.saveSettings(this.state.settings);
      this.render();
    }

    // --- TOASTS ---
    showToast(type, title, message = '') {
      const id = generateId('toast');
      this.toasts.push({ id, type, title, message });
      this.renderToasts();
      setTimeout(() => {
        this.toasts = this.toasts.filter((t) => t.id !== id);
        this.renderToasts();
      }, 3200);
    }

    renderToasts() {
      let container = document.getElementById('toast-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0';
        document.body.appendChild(container);
      }
      container.innerHTML = this.toasts
        .map((t) => {
          const colors =
            t.type === 'error'
              ? 'border-rose-500/40 bg-rose-950/90 text-rose-100'
              : t.type === 'success'
              ? 'border-emerald-500/40 bg-slate-900/95 text-emerald-300'
              : 'border-indigo-500/40 bg-slate-900/95 text-indigo-200';
          const ic = t.type === 'error' ? 'AlertCircle' : t.type === 'success' ? 'CheckCircle2' : 'Sparkles';
          return `
            <div class="pointer-events-auto flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl border shadow-xl backdrop-blur-md text-xs animate-slide-down ${colors}">
              <span class="mt-0.5 shrink-0">${icon(ic, 'w-4 h-4')}</span>
              <div class="flex-1 min-w-0">
                <div class="font-bold">${escapeHtml(t.title)}</div>
                ${t.message ? `<div class="text-[11px] opacity-85 mt-0.5">${escapeHtml(t.message)}</div>` : ''}
              </div>
            </div>
          `;
        })
        .join('');
    }

    // --- HELPERS & SELECTORS ---
    getActiveBoard() {
      return this.state.boards.find((b) => b.id === this.state.settings.activeBoardId && !b.isArchived) || null;
    }

    getBoardColumns(boardId) {
      return this.state.columns
        .filter((c) => c.boardId === boardId)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }

    isColumnDone(column) {
      if (!column) return false;
      const t = (column.title || '').toLowerCase();
      return t.includes('conclu') || t.includes('done') || t.includes('finaliz') || t.includes('entregue');
    }

    filterCardsList(cards) {
      const { search, priorities, dueFilter, sortBy } = this.state.filters;
      const q = (search || '').trim().toLowerCase();

      const filtered = cards.filter((card) => {
        if (q) {
          const inTitle = (card.title || '').toLowerCase().includes(q);
          const inDesc = (card.description || '').toLowerCase().includes(q);
          const inNotes = (card.notes || '').toLowerCase().includes(q);
          const inChk = (card.checklists || []).some((chk) => (chk.text || '').toLowerCase().includes(q));
          if (!inTitle && !inDesc && !inNotes && !inChk) return false;
        }

        if (priorities.length > 0 && !priorities.includes(card.priority)) {
          return false;
        }

        if (dueFilter !== 'all') {
          const col = this.state.columns.find((c) => c.id === card.columnId);
          const status = getDueStatus(card.dueDate, this.isColumnDone(col));
          if (dueFilter === 'none' && card.dueDate) return false;
          if (dueFilter === 'overdue' && !status?.isOverdue) return false;
          if (dueFilter === 'today' && !status?.isToday) return false;
          if (dueFilter === 'soon' && !status?.isSoon) return false;
        }

        return true;
      });

      return filtered.sort((a, b) => {
        if (sortBy === 'priority') {
          const lA = PRIORITY_CONFIG[a.priority]?.level || 0;
          const lB = PRIORITY_CONFIG[b.priority]?.level || 0;
          return lB - lA;
        }
        if (sortBy === 'dueDate') {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return a.dueDate.localeCompare(b.dueDate);
        }
        if (sortBy === 'title') {
          return (a.title || '').localeCompare(b.title || '');
        }
        return (a.order ?? 0) - (b.order ?? 0);
      });
    }

    async logActivity(cardId, details) {
      const act = {
        id: generateId('act'),
        cardId,
        details,
        timestamp: new Date().toISOString(),
      };
      this.state.activities.unshift(act);
      await dbService.addActivity(act);
    }

    // --- BOARD CRUD ---
    async selectBoard(boardId) {
      this.state.settings.activeBoardId = boardId;
      this.state.analyticsBoardId = boardId;
      if (this.state.viewMode !== 'kanban' && this.state.viewMode !== 'list') {
        this.state.viewMode = 'kanban';
      }
      if (window.innerWidth < 1024) {
        this.state.isSidebarOpen = false;
      }
      await dbService.saveSettings(this.state.settings);
      this.render();
    }

    async createBoard({ title, description, color }) {
      const now = new Date().toISOString();
      const newBoard = {
        id: generateId('board'),
        title: title.trim(),
        description: (description || '').trim(),
        color: color || 'indigo',
        icon: 'Kanban',
        isFavorite: false,
        isArchived: false,
        order: this.state.boards.length,
        createdAt: now,
        updatedAt: now,
      };

      const defaultTemplates = initialData.DEFAULT_COLUMN_TEMPLATES || [
        { title: 'Backlog', subtitle: 'Demandas pendentes', color: '#64748b', order: 0 },
        { title: 'A Fazer / To Do', subtitle: 'Planejado para execução imediata', color: '#3b82f6', order: 1 },
        { title: 'Em Andamento / In Progress', subtitle: 'Tarefas em desenvolvimento', color: '#f59e0b', order: 2 },
        { title: 'Revisão / Homologação', subtitle: 'Testes, validação e QA', color: '#a855f7', order: 3 },
        { title: 'Concluído / Done', subtitle: 'Entregas finalizadas', color: '#10b981', order: 4 },
      ];

      const newCols = defaultTemplates.map((tpl, idx) => ({
        id: generateId('col'),
        boardId: newBoard.id,
        title: tpl.title,
        subtitle: tpl.subtitle,
        color: tpl.color,
        order: idx,
        createdAt: now,
      }));

      this.state.boards.push(newBoard);
      this.state.columns.push(...newCols);
      this.state.settings.activeBoardId = newBoard.id;

      await dbService.saveBoard(newBoard);
      await dbService.saveColumns(newCols);
      await dbService.saveSettings(this.state.settings);

      soundManager.playCardCreate();
      this.showToast('success', 'Quadro criado!', `"${newBoard.title}" estruturado com as 5 etapas padrão.`);
      this.render();
    }

    async updateBoard(boardId, partial) {
      const idx = this.state.boards.findIndex((b) => b.id === boardId);
      if (idx === -1) return;
      this.state.boards[idx] = {
        ...this.state.boards[idx],
        ...partial,
        updatedAt: new Date().toISOString(),
      };
      await dbService.saveBoard(this.state.boards[idx]);
      this.showToast('success', 'Quadro atualizado');
      this.render();
    }

    async toggleFavoriteBoard(boardId) {
      const board = this.state.boards.find((b) => b.id === boardId);
      if (!board) return;
      await this.updateBoard(boardId, { isFavorite: !board.isFavorite });
    }

    async duplicateBoard(boardId) {
      const source = this.state.boards.find((b) => b.id === boardId);
      if (!source) return;
      const now = new Date().toISOString();
      const newBoard = {
        ...JSON.parse(JSON.stringify(source)),
        id: generateId('board'),
        title: `${source.title} (Cópia)`,
        order: this.state.boards.length,
        createdAt: now,
        updatedAt: now,
      };

      const colMap = new Map();
      const sourceCols = this.getBoardColumns(boardId);
      const newCols = sourceCols.map((col) => {
        const newColId = generateId('col');
        colMap.set(col.id, newColId);
        return {
          ...JSON.parse(JSON.stringify(col)),
          id: newColId,
          boardId: newBoard.id,
          createdAt: now,
        };
      });

      const sourceCards = this.state.cards.filter((c) => c.boardId === boardId && !c.isArchived);
      const newCards = sourceCards.map((card) => ({
        ...JSON.parse(JSON.stringify(card)),
        id: generateId('card'),
        boardId: newBoard.id,
        columnId: colMap.get(card.columnId) || newCols[0]?.id,
        createdAt: now,
        updatedAt: now,
      }));

      this.state.boards.push(newBoard);
      this.state.columns.push(...newCols);
      this.state.cards.push(...newCards);
      this.state.settings.activeBoardId = newBoard.id;

      await dbService.saveBoard(newBoard);
      await dbService.saveColumns(newCols);
      await dbService.saveCards(newCards);
      await dbService.saveSettings(this.state.settings);

      this.showToast('success', 'Quadro duplicado!', `"${newBoard.title}" criado com sucesso.`);
      this.render();
    }

    async archiveBoard(boardId) {
      await this.updateBoard(boardId, { isArchived: true });
      if (this.state.settings.activeBoardId === boardId) {
        const next = this.state.boards.find((b) => !b.isArchived && b.id !== boardId);
        this.state.settings.activeBoardId = next ? next.id : null;
        await dbService.saveSettings(this.state.settings);
      }
      this.showToast('info', 'Quadro arquivado', 'Disponível na Central de Arquivos.');
      this.render();
    }

    async restoreBoard(boardId) {
      await this.updateBoard(boardId, { isArchived: false });
      if (!this.state.settings.activeBoardId) {
        this.state.settings.activeBoardId = boardId;
        await dbService.saveSettings(this.state.settings);
      }
      this.showToast('success', 'Quadro restaurado!');
      this.render();
    }

    async deleteBoard(boardId) {
      const board = this.state.boards.find((b) => b.id === boardId);
      this.state.boards = this.state.boards.filter((b) => b.id !== boardId);
      this.state.columns = this.state.columns.filter((c) => c.boardId !== boardId);
      this.state.cards = this.state.cards.filter((c) => c.boardId !== boardId);

      if (this.state.settings.activeBoardId === boardId) {
        const next = this.state.boards.find((b) => !b.isArchived);
        this.state.settings.activeBoardId = next ? next.id : null;
        await dbService.saveSettings(this.state.settings);
      }

      await dbService.deleteBoard(boardId);
      soundManager.playDelete();
      this.showToast('info', 'Quadro excluído', board ? `"${board.title}" foi removido.` : '');
      this.render();
    }

    // --- COLUMN CRUD ---
    async createColumn({ title, subtitle, color, cardLimit }) {
      const activeBoard = this.getActiveBoard();
      if (!activeBoard) return;
      const boardCols = this.getBoardColumns(activeBoard.id);
      const newCol = {
        id: generateId('col'),
        boardId: activeBoard.id,
        title: title.trim(),
        subtitle: (subtitle || '').trim(),
        color: color || '#6366f1',
        cardLimit: cardLimit ? parseInt(cardLimit, 10) : undefined,
        order: boardCols.length,
        createdAt: new Date().toISOString(),
      };
      this.state.columns.push(newCol);
      await dbService.saveColumn(newCol);
      soundManager.playCardCreate();
      this.showToast('success', 'Coluna adicionada', `"${newCol.title}" criada.`);
      this.render();
    }

    async updateColumn(columnId, partial) {
      const idx = this.state.columns.findIndex((c) => c.id === columnId);
      if (idx === -1) return;
      this.state.columns[idx] = { ...this.state.columns[idx], ...partial };
      await dbService.saveColumn(this.state.columns[idx]);
      this.render();
    }

    async moveColumnOrder(columnId, direction) {
      const col = this.state.columns.find((c) => c.id === columnId);
      if (!col) return;
      const boardCols = this.getBoardColumns(col.boardId);
      const currentIdx = boardCols.findIndex((c) => c.id === columnId);
      const targetIdx = direction === 'left' ? currentIdx - 1 : currentIdx + 1;
      if (targetIdx < 0 || targetIdx >= boardCols.length) return;

      const temp = boardCols[currentIdx];
      boardCols[currentIdx] = boardCols[targetIdx];
      boardCols[targetIdx] = temp;

      boardCols.forEach((c, idx) => {
        c.order = idx;
      });
      await dbService.saveColumns(boardCols);
      soundManager.playCardMove();
      this.render();
    }

    async clearColumnCards(columnId) {
      const toRemove = this.state.cards.filter((c) => c.columnId === columnId && !c.isArchived);
      for (const card of toRemove) {
        await dbService.deleteCard(card.id);
      }
      this.state.cards = this.state.cards.filter((c) => c.columnId !== columnId || c.isArchived);
      soundManager.playDelete();
      this.showToast('info', 'Coluna limpa', `${toRemove.length} tarefas removidas.`);
      this.render();
    }

    async deleteColumn(columnId) {
      const col = this.state.columns.find((c) => c.id === columnId);
      this.state.columns = this.state.columns.filter((c) => c.id !== columnId);
      this.state.cards = this.state.cards.filter((c) => c.columnId !== columnId);
      await dbService.deleteColumn(columnId);
      soundManager.playDelete();
      this.showToast('info', 'Coluna excluída', col ? `"${col.title}" removida.` : '');
      this.render();
    }

    // --- CARD CRUD & MOVEMENTS ---
    async createCard({ columnId, title, description = '', priority = 'medium', openAfterCreate = false }) {
      const activeBoard = this.getActiveBoard();
      if (!activeBoard) return null;
      const colCards = this.state.cards.filter((c) => c.columnId === columnId && !c.isArchived);
      const now = new Date().toISOString();
      const newCard = {
        id: generateId('card'),
        boardId: activeBoard.id,
        columnId,
        title: title.trim(),
        description: description.trim(),
        priority,
        dueDate: null,
        labels: [],
        checklists: [],
        notes: '',
        links: [],
        isArchived: false,
        order: colCards.length,
        createdAt: now,
        updatedAt: now,
      };

      this.state.cards.push(newCard);
      await dbService.saveCard(newCard);
      await this.logActivity(newCard.id, `Tarefa criada na coluna "${this.state.columns.find((c) => c.id === columnId)?.title || 'Coluna'}"`);

      soundManager.playCardCreate();
      this.showToast('success', 'Tarefa criada!', `"${newCard.title}" adicionada ao quadro.`);
      if (openAfterCreate) {
        this.state.selectedCardId = newCard.id;
      }
      this.render();
      return newCard;
    }

    async updateCard(cardId, partial, activityMessage = null) {
      const idx = this.state.cards.findIndex((c) => c.id === cardId);
      if (idx === -1) return;
      const prevCard = this.state.cards[idx];
      const updated = {
        ...prevCard,
        ...partial,
        updatedAt: new Date().toISOString(),
      };
      this.state.cards[idx] = updated;
      await dbService.saveCard(updated);

      if (activityMessage) {
        await this.logActivity(cardId, activityMessage);
      }

      // Check if moved to a "Done" column
      if (partial.columnId && partial.columnId !== prevCard.columnId) {
        const destCol = this.state.columns.find((c) => c.id === partial.columnId);
        if (this.isColumnDone(destCol)) {
          soundManager.playTaskComplete();
          if (this.state.settings.enableConfetti) triggerConfetti(0.5, 0.5);
          this.showToast('success', 'Tarefa concluída! 🎉', `"${updated.title}" movida para ${destCol.title}.`);
        } else {
          soundManager.playCardMove();
        }
      }

      this.render();
    }

    async moveCard(cardId, destColumnId, targetCardId = null, insertAfter = false) {
      const card = this.state.cards.find((c) => c.id === cardId);
      if (!card) return;
      const prevColId = card.columnId;
      const prevCol = this.state.columns.find((c) => c.id === prevColId);
      const destCol = this.state.columns.find((c) => c.id === destColumnId);
      if (!destCol) return;

      // Get cards in destination column (excluding dragged card)
      const destCards = this.state.cards
        .filter((c) => c.columnId === destColumnId && !c.isArchived && c.id !== cardId)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      let insertIndex = destCards.length;
      if (targetCardId) {
        const tIdx = destCards.findIndex((c) => c.id === targetCardId);
        if (tIdx !== -1) {
          insertIndex = insertAfter ? tIdx + 1 : tIdx;
        }
      }

      card.columnId = destColumnId;
      card.updatedAt = new Date().toISOString();
      destCards.splice(insertIndex, 0, card);

      // Reassign order for destination column
      const toSave = [];
      destCards.forEach((c, i) => {
        c.order = i;
        toSave.push(c);
      });

      // Also normalize source column if different
      if (prevColId !== destColumnId) {
        const sourceCards = this.state.cards
          .filter((c) => c.columnId === prevColId && !c.isArchived)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        sourceCards.forEach((c, i) => {
          c.order = i;
          toSave.push(c);
        });
        await this.logActivity(card.id, `Movida de "${prevCol?.title || ''}" para "${destCol.title}"`);
      }

      await dbService.saveCards(toSave);

      if (prevColId !== destColumnId && this.isColumnDone(destCol)) {
        soundManager.playTaskComplete();
        if (this.state.settings.enableConfetti) triggerConfetti(0.5, 0.55);
        this.showToast('success', 'Entrega Concluída! 🎉', `"${card.title}" finalizada.`);
      } else {
        soundManager.playCardMove();
      }

      this.render();
    }

    async duplicateCard(cardId) {
      const source = this.state.cards.find((c) => c.id === cardId);
      if (!source) return;
      const now = new Date().toISOString();
      const colCards = this.state.cards.filter((c) => c.columnId === source.columnId && !c.isArchived);
      const copy = {
        ...JSON.parse(JSON.stringify(source)),
        id: generateId('card'),
        title: `${source.title} (Cópia)`,
        order: colCards.length,
        createdAt: now,
        updatedAt: now,
      };
      this.state.cards.push(copy);
      await dbService.saveCard(copy);
      soundManager.playCardCreate();
      this.showToast('success', 'Tarefa duplicada!');
      this.render();
    }

    async archiveCard(cardId) {
      const card = this.state.cards.find((c) => c.id === cardId);
      if (!card) return;
      await this.updateCard(cardId, { isArchived: true }, 'Tarefa arquivada');
      if (this.state.selectedCardId === cardId) this.state.selectedCardId = null;
      this.showToast('info', 'Tarefa arquivada', 'Você pode restaurá-la na Central de Arquivos.');
      this.render();
    }

    async restoreCard(cardId) {
      await this.updateCard(cardId, { isArchived: false }, 'Tarefa restaurada do arquivo');
      this.showToast('success', 'Tarefa restaurada!');
      this.render();
    }

    async deleteCard(cardId) {
      const card = this.state.cards.find((c) => c.id === cardId);
      this.state.cards = this.state.cards.filter((c) => c.id !== cardId);
      if (this.state.selectedCardId === cardId) this.state.selectedCardId = null;
      await dbService.deleteCard(cardId);
      soundManager.playDelete();
      this.showToast('info', 'Tarefa excluída', card ? `"${card.title}" foi removida.` : '');
      this.render();
    }

    // --- SUBTASKS, LABELS, LINKS ---
    async toggleSubtask(cardId, subtaskId) {
      const card = this.state.cards.find((c) => c.id === cardId);
      if (!card) return;
      const checklists = (card.checklists || []).map((item) =>
        item.id === subtaskId ? { ...item, completed: !item.completed } : item
      );
      const allCompleted = checklists.length > 0 && checklists.every((c) => c.completed);
      if (allCompleted) {
        soundManager.playTaskComplete();
      } else {
        soundManager.playCardMove();
      }
      await this.updateCard(cardId, { checklists });
    }

    async addSubtask(cardId, text) {
      const card = this.state.cards.find((c) => c.id === cardId);
      if (!card || !text.trim()) return;
      const checklists = [
        ...(card.checklists || []),
        { id: generateId('chk'), text: text.trim(), completed: false },
      ];
      await this.updateCard(cardId, { checklists }, `Subtarefa adicionada: "${text.trim()}"`);
    }

    async deleteSubtask(cardId, subtaskId) {
      const card = this.state.cards.find((c) => c.id === cardId);
      if (!card) return;
      const checklists = (card.checklists || []).filter((item) => item.id !== subtaskId);
      await this.updateCard(cardId, { checklists });
    }

    async createLabel(name, color) {
      const newLbl = {
        id: generateId('lbl'),
        name: name.trim(),
        color: color || 'indigo',
      };
      this.state.labels.push(newLbl);
      await dbService.saveLabel(newLbl);
      return newLbl;
    }

    async addCardLink(cardId, title, url) {
      const card = this.state.cards.find((c) => c.id === cardId);
      if (!card || !url.trim()) return;
      let normalizedUrl = url.trim();
      if (!/^https?:\/\//i.test(normalizedUrl)) {
        normalizedUrl = 'https://' + normalizedUrl;
      }
      const links = [
        ...(card.links || []),
        { id: generateId('lnk'), title: title.trim() || normalizedUrl, url: normalizedUrl },
      ];
      await this.updateCard(cardId, { links }, `Link anexado: "${title.trim() || normalizedUrl}"`);
    }

    async deleteCardLink(cardId, linkId) {
      const card = this.state.cards.find((c) => c.id === cardId);
      if (!card) return;
      const links = (card.links || []).filter((l) => l.id !== linkId);
      await this.updateCard(cardId, { links });
    }

    // --- BACKUP, EXPORT & RESET ---
    async exportBackupJson() {
      const data = await dbService.exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kanban-flow-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      this.showToast('success', 'Backup JSON exportado!', 'Arquivo salvo na sua pasta de downloads.');
    }

    exportBoardMarkdown() {
      const board = this.getActiveBoard() || this.state.boards[0];
      if (!board) return;
      const cols = this.getBoardColumns(board.id);
      const cards = this.state.cards.filter((c) => c.boardId === board.id && !c.isArchived);

      let md = `# 📋 Relatório do Projeto: ${board.title}\n\n`;
      md += `> **Descrição**: ${board.description || 'Sem descrição'}\n`;
      md += `> **Emitido em**: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}\n`;
      md += `> **Total de Tarefas**: ${cards.length}\n\n---\n\n`;

      for (const col of cols) {
        const colCards = cards.filter((c) => c.columnId === col.id).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        md += `## 📌 ${col.title} (${colCards.length})\n\n`;
        if (colCards.length === 0) {
          md += `_Nenhuma tarefa nesta etapa._\n\n`;
        } else {
          for (const card of colCards) {
            const pLabel = PRIORITY_CONFIG[card.priority]?.label || card.priority;
            const doneCount = (card.checklists || []).filter((chk) => chk.completed).length;
            const totalChk = (card.checklists || []).length;
            md += `### • ${card.title}\n`;
            md += `- **Prioridade**: ${pLabel}`;
            if (card.dueDate) md += ` | **Prazo**: ${formatDateShort(card.dueDate)}`;
            if (totalChk > 0) md += ` | **Checklist**: ${doneCount}/${totalChk}`;
            md += `\n`;
            if (card.description) md += `- **Descrição**: ${card.description}\n`;
            if (card.notes) md += `- **Notas Técnicas**: ${card.notes}\n`;
            md += `\n`;
          }
        }
      }

      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-${board.id}-${new Date().toISOString().split('T')[0]}.md`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      this.showToast('success', 'Relatório Markdown (.md) gerado!');
    }

    async executeImportBackup() {
      if (!this.state.importedBackupData) return;
      try {
        await dbService.importData(this.state.importedBackupData, this.state.importMode);
        const fresh = await dbService.initialize(initialData);
        this.state.boards = fresh.boards;
        this.state.columns = fresh.columns;
        this.state.cards = fresh.cards;
        this.state.labels = fresh.labels;
        this.state.activities = fresh.activities;
        this.state.settings = fresh.settings;
        this.state.importedBackupData = null;
        this.state.isBackupModalOpen = false;
        this.showToast('success', 'Backup importado com sucesso!');
        this.render();
      } catch (err) {
        this.state.importError = err.message || 'Falha ao importar backup.';
        this.render();
      }
    }

    async resetDemoData() {
      const seeded = await dbService.resetToDemo(initialData);
      this.state.boards = seeded.boards;
      this.state.columns = seeded.columns;
      this.state.cards = seeded.cards;
      this.state.labels = seeded.labels;
      this.state.activities = seeded.activities;
      this.state.settings = seeded.settings;
      this.state.isBackupModalOpen = false;
      this.showToast('success', 'Dados originais restaurados!', 'Quadros do TCC e Projeto de Exemplo recarregados.');
      this.render();
    }

    async clearAllData() {
      await dbService.clearAll();
      this.state.boards = [];
      this.state.columns = [];
      this.state.cards = [];
      this.state.activities = [];
      this.state.settings.activeBoardId = null;
      this.state.isBackupModalOpen = false;
      soundManager.playDelete();
      this.showToast('info', 'Armazenamento limpo', 'Todos os quadros e tarefas foram removidos.');
      this.render();
    }

    // --- VIEWS RENDERING ---
    renderBadgePriority(priority, size = 'sm') {
      const conf = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;
      const pad = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
      return `<span class="inline-flex items-center gap-1 rounded-md font-bold border ${conf.badgeBg} ${conf.border} ${pad}">
        <span class="w-1.5 h-1.5 rounded-full" style="background-color:${conf.dotColor}"></span>
        ${escapeHtml(conf.label)}
      </span>`;
    }

    renderBadgeLabel(label, size = 'sm') {
      if (!label) return '';
      const c = LABEL_COLORS[label.color] || LABEL_COLORS.indigo;
      const pad = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
      return `<span class="inline-flex items-center gap-1 rounded-md font-semibold border ${c.bg} ${c.border} ${pad}">
        <span class="w-1.5 h-1.5 rounded-full ${c.dot}"></span>
        ${escapeHtml(label.name)}
      </span>`;
    }

    renderSidebar() {
      const { boards, cards, viewMode, isSidebarOpen, settings } = this.state;
      const activeBoard = this.getActiveBoard();
      const activeBoards = boards.filter((b) => !b.isArchived);
      const favoriteBoards = activeBoards.filter((b) => b.isFavorite);
      const archivedCount = boards.filter((b) => b.isArchived).length + cards.filter((c) => c.isArchived).length;
      const isDark = settings.theme === 'dark';

      return `
        ${isSidebarOpen ? `<div data-action="close-sidebar-backdrop" class="fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-xs lg:hidden animate-fade-in"></div>` : ''}
        <aside class="${isSidebarOpen ? 'translate-x-0 w-68' : '-translate-x-full w-0 lg:w-0'} fixed lg:static inset-y-0 left-0 z-40 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 transition-all duration-200 overflow-hidden shrink-0 select-none" style="${isSidebarOpen ? 'width: 272px;' : 'width: 0px; border-right-width: 0px;'}">
          <!-- Brand Header -->
          <div class="p-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
                ${icon('Kanban', 'w-5 h-5')}
              </div>
              <div class="min-w-0">
                <h1 class="text-sm font-extrabold tracking-tight text-slate-900 dark:text-slate-100 truncate">Kanban Flow</h1>
                <p class="text-[11px] font-medium text-slate-400 dark:text-slate-500 truncate">TCC • Gestão Client-Side</p>
              </div>
            </div>
            <button type="button" data-action="toggle-sidebar" class="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800" title="Fechar menu">
              ${icon('X', 'w-4 h-4')}
            </button>
          </div>

          <!-- Navigation Links -->
          <div class="flex-1 overflow-y-auto p-3 space-y-5">
            <div class="space-y-1">
              <div class="px-3 pb-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Navegação</div>
              <button type="button" data-action="set-view" data-view="dashboard" class="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${viewMode === 'dashboard' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100'}">
                ${icon('LayoutDashboard', 'w-4 h-4')}
                <span>Painel Geral (Dashboard)</span>
              </button>
              <button type="button" data-action="set-view" data-view="kanban" class="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${viewMode === 'kanban' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100'}">
                ${icon('Kanban', 'w-4 h-4')}
                <span>Quadro Kanban</span>
              </button>
              <button type="button" data-action="set-view" data-view="list" class="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${viewMode === 'list' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100'}">
                ${icon('ListTodo', 'w-4 h-4')}
                <span>Todas as Tarefas (Lista)</span>
              </button>
              <button type="button" data-action="set-view" data-view="analytics" class="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${viewMode === 'analytics' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100'}">
                ${icon('BarChart3', 'w-4 h-4')}
                <span>Métricas de Produtividade</span>
              </button>
              <button type="button" data-action="open-archive" class="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                <span class="flex items-center gap-3">
                  ${icon('Archive', 'w-4 h-4')}
                  <span>Central de Arquivos</span>
                </span>
                ${archivedCount > 0 ? `<span class="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400">${archivedCount}</span>` : ''}
              </button>
            </div>

            ${favoriteBoards.length > 0 ? `
              <div class="space-y-1">
                <div class="px-3 pb-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <span class="text-amber-500">${icon('Star', 'w-3.5 h-3.5')}</span>
                  Favoritos
                </div>
                ${favoriteBoards
                  .map((b) => {
                    const isSelected = activeBoard?.id === b.id;
                    const bCards = cards.filter((c) => c.boardId === b.id && !c.isArchived).length;
                    return `
                      <button type="button" data-action="select-board" data-board-id="${escapeHtml(b.id)}" class="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left ${isSelected ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70'}">
                        <span class="flex items-center gap-2 min-w-0">
                          <span class="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                          <span class="truncate">${escapeHtml(b.title)}</span>
                        </span>
                        <span class="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">${bCards}</span>
                      </button>
                    `;
                  })
                  .join('')}
              </div>
            ` : ''}

            <div class="space-y-1">
              <div class="px-3 pb-1 flex items-center justify-between">
                <span class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Quadros (${activeBoards.length})</span>
                <button type="button" data-action="open-create-board" class="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5">
                  ${icon('Plus', 'w-3 h-3')} Novo
                </button>
              </div>
              ${activeBoards
                .map((b) => {
                  const isSelected = activeBoard?.id === b.id;
                  const bColor = BOARD_COLORS.find((c) => c.id === b.color) || BOARD_COLORS[0];
                  const bCards = cards.filter((c) => c.boardId === b.id && !c.isArchived).length;
                  return `
                    <button type="button" data-action="select-board" data-board-id="${escapeHtml(b.id)}" class="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left ${isSelected ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70'}">
                      <span class="flex items-center gap-2 min-w-0">
                        <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color:${bColor.accent}"></span>
                        <span class="truncate">${escapeHtml(b.title)}</span>
                      </span>
                      <span class="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">${bCards}</span>
                    </button>
                  `;
                })
                .join('')}
            </div>
          </div>

          <!-- Footer Controls -->
          <div class="p-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5 bg-slate-50/50 dark:bg-slate-900/50">
            <div class="grid grid-cols-4 gap-1.5">
              <button type="button" data-action="toggle-theme" class="p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center justify-center transition-colors" title="${isDark ? 'Mudar para Modo Claro (D)' : 'Mudar para Modo Escuro (D)'}">
                ${isDark ? icon('Sun', 'w-4 h-4 text-amber-400') : icon('Moon', 'w-4 h-4 text-indigo-600')}
              </button>
              <button type="button" data-action="toggle-sound" class="p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center transition-colors" title="${settings.enableSound ? 'Efeitos sonoros ativados' : 'Efeitos sonoros desativados'}">
                ${settings.enableSound ? icon('Volume2', 'w-4 h-4 text-emerald-500') : icon('VolumeX', 'w-4 h-4')}
              </button>
              <button type="button" data-action="open-shortcuts" class="p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center justify-center transition-colors" title="Atalhos de teclado (?)">
                ${icon('Keyboard', 'w-4 h-4')}
              </button>
              <button type="button" data-action="open-backup" class="p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center justify-center transition-colors" title="Backup & localStorage">
                ${icon('HardDrive', 'w-4 h-4')}
              </button>
            </div>
            <div class="px-2.5 py-2 rounded-xl bg-slate-200/60 dark:bg-slate-800/80 text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between">
              <span class="flex items-center gap-1.5 font-semibold">
                ${icon('Sparkles', 'w-3.5 h-3.5 text-indigo-500')}
                100% Client-Side (localStorage)
              </span>
              <span class="w-2 h-2 rounded-full bg-emerald-500" title="Persistência localStorage Ativa"></span>
            </div>
          </div>
        </aside>
      `;
    }

    renderHeader() {
      const activeBoard = this.getActiveBoard();
      const { viewMode, filters, isBoardMenuOpen, isFilterMenuOpen, settings } = this.state;
      const activeFiltersCount =
        (filters.search ? 1 : 0) +
        (filters.priorities.length > 0 ? 1 : 0) +
        (filters.dueFilter !== 'all' ? 1 : 0) +
        (filters.sortBy !== 'order' ? 1 : 0);

      return `
        <header class="h-16 px-4 sm:px-6 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0 z-20">
          <!-- Left: Menu toggle & Active Board Info -->
          <div class="flex items-center gap-3 min-w-0">
            <button type="button" data-action="toggle-sidebar" class="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Alternar barra lateral">
              ${icon('Menu', 'w-5 h-5')}
            </button>

            ${activeBoard ? `
              <div class="flex items-center gap-2 min-w-0">
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5">
                    <h2 class="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 truncate">${escapeHtml(activeBoard.title)}</h2>
                    <button type="button" data-action="toggle-favorite-board" data-board-id="${escapeHtml(activeBoard.id)}" class="p-1 rounded-lg transition-colors ${activeBoard.isFavorite ? 'text-amber-400' : 'text-slate-400 hover:text-amber-400'}" title="${activeBoard.isFavorite ? 'Remover dos favoritos' : 'Fixar nos favoritos'}">
                      ${icon('Star', 'w-4 h-4')}
                    </button>
                  </div>
                  ${activeBoard.description ? `<p class="hidden sm:block text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-md">${escapeHtml(activeBoard.description)}</p>` : ''}
                </div>

                <!-- Board Options Dropdown -->
                <div class="relative">
                  <button type="button" data-action="toggle-board-menu" class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Opções do quadro">
                    ${icon('MoreVertical', 'w-4 h-4')}
                  </button>
                  ${isBoardMenuOpen ? `
                    <div data-action="close-popovers" class="fixed inset-0 z-30"></div>
                    <div class="absolute left-0 mt-2 w-48 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl z-40 py-1.5 text-xs font-medium animate-slide-down">
                      <button type="button" data-action="open-edit-board" data-board-id="${escapeHtml(activeBoard.id)}" class="w-full text-left px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center gap-2.5">
                        ${icon('Edit2', 'w-3.5 h-3.5 text-slate-400')} Editar Quadro
                      </button>
                      <button type="button" data-action="duplicate-board" data-board-id="${escapeHtml(activeBoard.id)}" class="w-full text-left px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center gap-2.5">
                        ${icon('Copy', 'w-3.5 h-3.5 text-slate-400')} Duplicar Quadro
                      </button>
                      <button type="button" data-action="archive-board" data-board-id="${escapeHtml(activeBoard.id)}" class="w-full text-left px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center gap-2.5">
                        ${icon('Archive', 'w-3.5 h-3.5 text-slate-400')} Arquivar Quadro
                      </button>
                      <div class="my-1 border-t border-slate-100 dark:border-slate-700"></div>
                      <button type="button" data-action="confirm-delete-board" data-board-id="${escapeHtml(activeBoard.id)}" class="w-full text-left px-3.5 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2.5">
                        ${icon('Trash2', 'w-3.5 h-3.5')} Excluir Quadro
                      </button>
                    </div>
                  ` : ''}
                </div>
              </div>
            ` : `<h2 class="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">Kanban Flow</h2>`}
          </div>

          <!-- Center: View Mode Switcher Pills -->
          <div class="hidden xl:flex items-center bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            <button type="button" data-action="set-view" data-view="kanban" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'kanban' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}">
              ${icon('Kanban', 'w-3.5 h-3.5')} Kanban
            </button>
            <button type="button" data-action="set-view" data-view="list" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}">
              ${icon('ListTodo', 'w-3.5 h-3.5')} Lista
            </button>
            <button type="button" data-action="set-view" data-view="dashboard" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'dashboard' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}">
              ${icon('LayoutDashboard', 'w-3.5 h-3.5')} Dashboard
            </button>
            <button type="button" data-action="set-view" data-view="analytics" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'analytics' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}">
              ${icon('BarChart3', 'w-3.5 h-3.5')} Métricas
            </button>
          </div>

          <!-- Right: Search, Filters & Actions -->
          <div class="flex items-center gap-2">
            <!-- Global Search Button -->
            <button type="button" data-action="open-global-search" class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 text-slate-500 dark:text-slate-400 text-xs font-medium border border-slate-200/80 dark:border-slate-700/80 transition-colors" title="Busca Global (Ctrl+K)">
              ${icon('Search', 'w-3.5 h-3.5 text-indigo-500')}
              <span class="hidden md:inline">Buscar...</span>
              <kbd class="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">Ctrl+K</kbd>
            </button>

            <!-- Filter Dropdown -->
            <div class="relative">
              <button type="button" data-action="toggle-filter-menu" class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${activeFiltersCount > 0 ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-300' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}" title="Filtros do Quadro">
                ${icon('SlidersHorizontal', 'w-3.5 h-3.5')}
                <span class="hidden sm:inline">Filtros</span>
                ${activeFiltersCount > 0 ? `<span class="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">${activeFiltersCount}</span>` : ''}
              </button>

              ${isFilterMenuOpen ? `
                <div data-action="close-popovers" class="fixed inset-0 z-30"></div>
                <div class="absolute right-0 mt-2 w-72 p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl z-40 space-y-3.5 animate-slide-down">
                  <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                    <span class="text-xs font-bold text-slate-900 dark:text-slate-100">Filtros e Visualização</span>
                    ${activeFiltersCount > 0 ? `<button type="button" data-action="reset-filters" class="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">Limpar Todos</button>` : ''}
                  </div>

                  <div>
                    <label class="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Filtrar por Texto</label>
                    <input type="text" data-input="filter-search" value="${escapeHtml(filters.search)}" placeholder="Título, nota ou subtarefa..." class="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-hidden focus:ring-2 focus:ring-indigo-500" />
                  </div>

                  <div>
                    <label class="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Prioridades</label>
                    <div class="grid grid-cols-2 gap-1.5">
                      ${['urgent', 'high', 'medium', 'low']
                        .map((p) => {
                          const active = filters.priorities.includes(p);
                          return `<button type="button" data-action="toggle-filter-priority" data-priority="${p}" class="px-2.5 py-1 rounded-lg text-[11px] font-semibold border text-left transition-colors ${active ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}">${PRIORITY_CONFIG[p].label}</button>`;
                        })
                        .join('')}
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-2">
                    <div>
                      <label class="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Prazo</label>
                      <select data-change="filter-due" class="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                        <option value="all" ${filters.dueFilter === 'all' ? 'selected' : ''}>Todos</option>
                        <option value="overdue" ${filters.dueFilter === 'overdue' ? 'selected' : ''}>Atrasadas</option>
                        <option value="today" ${filters.dueFilter === 'today' ? 'selected' : ''}>Vence hoje</option>
                        <option value="soon" ${filters.dueFilter === 'soon' ? 'selected' : ''}>Em até 3 dias</option>
                        <option value="none" ${filters.dueFilter === 'none' ? 'selected' : ''}>Sem prazo</option>
                      </select>
                    </div>
                    <div>
                      <label class="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Ordenar por</label>
                      <select data-change="filter-sort" class="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                        <option value="order" ${filters.sortBy === 'order' ? 'selected' : ''}>Padrão</option>
                        <option value="priority" ${filters.sortBy === 'priority' ? 'selected' : ''}>Prioridade</option>
                        <option value="dueDate" ${filters.sortBy === 'dueDate' ? 'selected' : ''}>Prazo</option>
                        <option value="title" ${filters.sortBy === 'title' ? 'selected' : ''}>Título (A-Z)</option>
                      </select>
                    </div>
                  </div>

                  <div class="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <span class="text-xs font-medium text-slate-600 dark:text-slate-300">Modo Compacto</span>
                    <input type="checkbox" data-change="toggle-compact" ${settings.compactCards ? 'checked' : ''} class="w-4 h-4 rounded text-indigo-600 cursor-pointer" />
                  </div>
                </div>
              ` : ''}
            </div>

            ${activeBoard ? `
              <button type="button" data-action="quick-new-task-header" class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]" title="Criar Nova Tarefa (N)">
                ${icon('Plus', 'w-3.5 h-3.5')}
                <span class="hidden sm:inline">Nova Tarefa</span>
              </button>
            ` : ''}

            <button type="button" data-action="open-backup" class="p-2 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Backup & Dados localStorage">
              ${icon('HardDrive', 'w-4 h-4')}
            </button>
          </div>
        </header>
      `;
    }

    renderTaskCard(card, column) {
      const { labels, settings, openCardMenuId } = this.state;
      const cardLabels = labels.filter((l) => (card.labels || []).includes(l.id));
      const totalSub = (card.checklists || []).length;
      const doneSub = (card.checklists || []).filter((c) => c.completed).length;
      const subPct = totalSub > 0 ? Math.round((doneSub / totalSub) * 100) : 0;
      const isDone = this.isColumnDone(column);
      const dueStatus = getDueStatus(card.dueDate, isDone);
      const isMenuOpen = openCardMenuId === card.id;
      const boardCols = this.getBoardColumns(card.boardId);

      return `
        <div
          class="kanban-card group relative p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/90 hover:border-indigo-400/70 dark:hover:border-indigo-500/50 shadow-xs hover:shadow-md"
          draggable="true"
          data-card-id="${escapeHtml(card.id)}"
          data-column-id="${escapeHtml(column.id)}"
          data-action="open-card"
        >
          <!-- Top Row: Priority, Labels & Menu -->
          <div class="flex items-start justify-between gap-2 mb-2">
            <div class="flex flex-wrap items-center gap-1">
              ${this.renderBadgePriority(card.priority, 'sm')}
              ${cardLabels.map((lbl) => this.renderBadgeLabel(lbl, 'sm')).join('')}
            </div>

            <div class="relative shrink-0" data-stop-propagation="true">
              <button type="button" data-action="toggle-card-menu" data-card-id="${escapeHtml(card.id)}" class="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 opacity-80 group-hover:opacity-100 transition-opacity" title="Ações do cartão">
                ${icon('MoreVertical', 'w-3.5 h-3.5')}
              </button>

              ${isMenuOpen ? `
                <div data-action="close-popovers" class="fixed inset-0 z-30"></div>
                <div class="absolute right-0 mt-1 w-48 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl z-40 py-1.5 text-xs font-medium animate-slide-down">
                  <button type="button" data-action="open-card" data-card-id="${escapeHtml(card.id)}" class="w-full text-left px-3 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center gap-2">
                    ${icon('Edit2', 'w-3.5 h-3.5 text-indigo-500')} Editar detalhes
                  </button>
                  <button type="button" data-action="duplicate-card" data-card-id="${escapeHtml(card.id)}" class="w-full text-left px-3 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center gap-2">
                    ${icon('Copy', 'w-3.5 h-3.5 text-slate-400')} Duplicar tarefa
                  </button>
                  <button type="button" data-action="archive-card" data-card-id="${escapeHtml(card.id)}" class="w-full text-left px-3 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center gap-2">
                    ${icon('Archive', 'w-3.5 h-3.5 text-slate-400')} Arquivar
                  </button>
                  <div class="my-1 border-t border-slate-100 dark:border-slate-700"></div>
                  <div class="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mover para etapa:</div>
                  ${boardCols
                    .filter((c) => c.id !== column.id)
                    .map(
                      (c) => `
                        <button type="button" data-action="quick-move-card" data-card-id="${escapeHtml(card.id)}" data-dest-col-id="${escapeHtml(c.id)}" class="w-full text-left px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center gap-2 truncate">
                          <span class="w-2 h-2 rounded-full shrink-0" style="background-color:${c.color || '#6366f1'}"></span>
                          <span class="truncate">${escapeHtml(c.title)}</span>
                        </button>
                      `
                    )
                    .join('')}
                  <div class="my-1 border-t border-slate-100 dark:border-slate-700"></div>
                  <button type="button" data-action="confirm-delete-card" data-card-id="${escapeHtml(card.id)}" class="w-full text-left px-3 py-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2">
                    ${icon('Trash2', 'w-3.5 h-3.5')} Excluir tarefa
                  </button>
                </div>
              ` : ''}
            </div>
          </div>

          <!-- Title -->
          <h4 class="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug mb-1.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            ${escapeHtml(card.title)}
          </h4>

          <!-- Description preview -->
          ${!settings.compactCards && card.description ? `
            <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3 leading-relaxed">
              ${escapeHtml(card.description)}
            </p>
          ` : ''}

          <!-- Subtasks progress & preview -->
          ${totalSub > 0 ? `
            <div class="mb-3 space-y-1.5" data-stop-propagation="true">
              <div class="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <span class="flex items-center gap-1">
                  ${icon('CheckSquare', 'w-3.5 h-3.5 text-indigo-500')} Subtarefas
                </span>
                <span>${doneSub}/${totalSub} (${subPct}%)</span>
              </div>
              <div class="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div class="h-full transition-all duration-300 rounded-full ${doneSub === totalSub ? 'bg-emerald-500' : 'bg-indigo-500'}" style="width:${subPct}%"></div>
              </div>
              ${!settings.compactCards ? `
                <div class="pt-1 space-y-1">
                  ${(card.checklists || [])
                    .slice(0, 2)
                    .map(
                      (item) => `
                        <label class="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer select-none">
                          <input type="checkbox" data-action="toggle-subtask-inline" data-card-id="${escapeHtml(card.id)}" data-subtask-id="${escapeHtml(item.id)}" ${item.completed ? 'checked' : ''} class="w-3.5 h-3.5 rounded text-indigo-600 cursor-pointer shrink-0" />
                          <span class="truncate ${item.completed ? 'line-through text-slate-400 dark:text-slate-500' : ''}">${escapeHtml(item.text)}</span>
                        </label>
                      `
                    )
                    .join('')}
                  ${totalSub > 2 ? `<div class="text-[10px] text-slate-400 pl-5">+${totalSub - 2} mais no cartão...</div>` : ''}
                </div>
              ` : ''}
            </div>
          ` : ''}

          <!-- Footer Metadata -->
          <div class="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
            ${dueStatus ? `
              <div class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${dueStatus.badgeClass}">
                ${dueStatus.isOverdue ? icon('Clock', 'w-3 h-3 text-rose-500') : icon('Calendar', 'w-3 h-3')}
                <span>${escapeHtml(dueStatus.relativeText)}</span>
              </div>
            ` : '<div></div>'}

            <div class="flex items-center gap-2 text-slate-400">
              ${card.notes ? `<span title="Possui notas técnicas" class="flex items-center gap-0.5">${icon('FileText', 'w-3.5 h-3.5')}</span>` : ''}
              ${card.links && card.links.length > 0 ? `<span title="${card.links.length} link(s)" class="flex items-center gap-0.5 text-indigo-500 dark:text-indigo-400">${icon('Link2', 'w-3.5 h-3.5')}<span class="text-[10px] font-bold">${card.links.length}</span></span>` : ''}
            </div>
          </div>
        </div>
      `;
    }

    renderBoardView() {
      const activeBoard = this.getActiveBoard();
      if (!activeBoard) {
        return `
          <div class="flex-1 flex items-center justify-center p-6">
            <div class="max-w-md text-center p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div class="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                ${icon('LayoutGrid', 'w-6 h-6')}
              </div>
              <h3 class="text-base font-bold text-slate-900 dark:text-slate-100">Nenhum quadro selecionado</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">Crie um novo quadro ou restaure os dados demonstrativos para começar a organizar suas entregas.</p>
              <div class="flex items-center justify-center gap-2 pt-2">
                <button type="button" data-action="open-create-board" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20">Criar Novo Quadro</button>
                <button type="button" data-action="reset-demo-direct" class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold">Restaurar Quadros do TCC</button>
              </div>
            </div>
          </div>
        `;
      }

      const boardColumns = this.getBoardColumns(activeBoard.id);
      const boardCards = this.state.cards.filter((c) => c.boardId === activeBoard.id && !c.isArchived);

      return `
        <div class="flex-1 flex items-start gap-4 p-4 sm:p-5 overflow-x-auto overflow-y-hidden min-h-0 select-none">
          ${boardColumns
            .map((col, colIdx) => {
              const rawColCards = boardCards.filter((c) => c.columnId === col.id);
              const filteredCards = this.filterCardsList(rawColCards);
              const isOverLimit = col.cardLimit && filteredCards.length > col.cardLimit;
              const isMenuOpen = this.state.openColumnMenuId === col.id;
              const isQuickAdding = this.state.quickAddColumnId === col.id;
              const isEditingTitle = this.state.editingColumnTitleId === col.id;

              return `
                <div
                  class="kanban-column-dropzone shrink-0 w-[300px] sm:w-[325px] max-h-full flex flex-col rounded-2xl bg-slate-100/90 dark:bg-slate-900/65 border border-slate-200/80 dark:border-slate-800/90 shadow-xs"
                  data-column-dropzone="${escapeHtml(col.id)}"
                >
                  <!-- Column Header -->
                  <div class="p-3.5 pb-2.5 flex items-start justify-between gap-2 border-b border-slate-200/60 dark:border-slate-800/70">
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center gap-2">
                        <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color:${col.color || '#6366f1'}"></span>
                        ${isEditingTitle ? `
                          <form data-form="rename-column" data-column-id="${escapeHtml(col.id)}" class="flex items-center gap-1 flex-1">
                            <input type="text" name="title" value="${escapeHtml(col.title)}" autofocus class="w-full text-xs font-bold px-2 py-1 rounded-lg border border-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-hidden" />
                            <button type="submit" class="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded">${icon('Check', 'w-3.5 h-3.5')}</button>
                          </form>
                        ` : `
                          <h3 data-action="start-rename-column" data-column-id="${escapeHtml(col.id)}" class="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-100 truncate cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400" title="Clique para renomear">${escapeHtml(col.title)}</h3>
                        `}
                        <span class="px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${isOverLimit ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/40 animate-pulse' : 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}">
                          ${filteredCards.length}${col.cardLimit ? `/${col.cardLimit}` : ''}
                        </span>
                      </div>
                      ${col.subtitle ? `<p class="text-[10px] font-medium text-slate-400 dark:text-slate-500 pl-4.5 mt-0.5 truncate">${escapeHtml(col.subtitle)}</p>` : ''}
                    </div>

                    <div class="flex items-center gap-0.5 shrink-0">
                      <button type="button" data-action="open-quick-add" data-column-id="${escapeHtml(col.id)}" class="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors" title="Nova tarefa nesta etapa">
                        ${icon('Plus', 'w-4 h-4')}
                      </button>
                      <div class="relative">
                        <button type="button" data-action="toggle-column-menu" data-column-id="${escapeHtml(col.id)}" class="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors" title="Opções da coluna">
                          ${icon('MoreVertical', 'w-4 h-4')}
                        </button>
                        ${isMenuOpen ? `
                          <div data-action="close-popovers" class="fixed inset-0 z-30"></div>
                          <div class="absolute right-0 mt-1 w-48 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl z-40 py-1.5 text-xs font-medium animate-slide-down">
                            <button type="button" data-action="start-rename-column" data-column-id="${escapeHtml(col.id)}" class="w-full text-left px-3 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center gap-2">
                              ${icon('Edit2', 'w-3.5 h-3.5')} Renomear etapa
                            </button>
                            ${colIdx > 0 ? `
                              <button type="button" data-action="move-column" data-column-id="${escapeHtml(col.id)}" data-dir="left" class="w-full text-left px-3 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center gap-2">
                                ${icon('ChevronLeft', 'w-3.5 h-3.5')} Mover para esquerda
                              </button>
                            ` : ''}
                            ${colIdx < boardColumns.length - 1 ? `
                              <button type="button" data-action="move-column" data-column-id="${escapeHtml(col.id)}" data-dir="right" class="w-full text-left px-3 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center gap-2">
                                ${icon('ChevronRight', 'w-3.5 h-3.5')} Mover para direita
                              </button>
                            ` : ''}
                            <button type="button" data-action="confirm-clear-column" data-column-id="${escapeHtml(col.id)}" class="w-full text-left px-3 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center gap-2">
                              ${icon('Eraser', 'w-3.5 h-3.5')} Limpar tarefas (${filteredCards.length})
                            </button>
                            <div class="my-1 border-t border-slate-100 dark:border-slate-700"></div>
                            <button type="button" data-action="confirm-delete-column" data-column-id="${escapeHtml(col.id)}" class="w-full text-left px-3 py-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2">
                              ${icon('Trash2', 'w-3.5 h-3.5')} Excluir coluna
                            </button>
                          </div>
                        ` : ''}
                      </div>
                    </div>
                  </div>

                  ${isOverLimit ? `
                    <div class="mx-3 mt-2 px-2.5 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] font-semibold flex items-center gap-1.5">
                      ${icon('AlertCircle', 'w-3.5 h-3.5 shrink-0')}
                      <span>Limite WIP excedido (${filteredCards.length}/${col.cardLimit})</span>
                    </div>
                  ` : ''}

                  <!-- Cards List -->
                  <div class="flex-1 overflow-y-auto p-2.5 space-y-2.5 min-h-[120px]" data-column-cards="${escapeHtml(col.id)}">
                    ${filteredCards.length === 0 ? `
                      <div class="h-28 rounded-xl border border-dashed border-slate-300/70 dark:border-slate-800 flex flex-col items-center justify-center text-center p-4 text-slate-400 dark:text-slate-500">
                        <span class="text-xs font-medium">Nenhuma tarefa aqui</span>
                        <span class="text-[10px] mt-0.5">Arraste um cartão ou clique em + Adicionar</span>
                      </div>
                    ` : filteredCards.map((card) => this.renderTaskCard(card, col)).join('')}
                  </div>

                  <!-- Column Footer: Quick Add -->
                  <div class="p-2.5 pt-1.5 border-t border-slate-200/50 dark:border-slate-800/60">
                    ${isQuickAdding ? `
                      <form data-form="quick-add-card" data-column-id="${escapeHtml(col.id)}" class="space-y-2 p-2 rounded-xl bg-white dark:bg-slate-800 border border-indigo-500/40 shadow-sm">
                        <input
                          type="text"
                          name="title"
                          placeholder="Título da nova tarefa..."
                          autofocus
                          required
                          class="w-full text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-hidden focus:ring-2 focus:ring-indigo-500"
                        />
                        <div class="flex items-center justify-between gap-2">
                          <select name="priority" class="text-[11px] font-semibold px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300">
                            <option value="low">Prioridade: Baixa</option>
                            <option value="medium" selected>Prioridade: Média</option>
                            <option value="high">Prioridade: Alta</option>
                            <option value="urgent">Prioridade: Urgente</option>
                          </select>
                          <div class="flex items-center gap-1">
                            <button type="button" data-action="cancel-quick-add" class="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg">${icon('X', 'w-4 h-4')}</button>
                            <button type="submit" class="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold">Adicionar</button>
                          </div>
                        </div>
                      </form>
                    ` : `
                      <button type="button" data-action="open-quick-add" data-column-id="${escapeHtml(col.id)}" class="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                        ${icon('Plus', 'w-3.5 h-3.5')} Adicionar Tarefa
                      </button>
                    `}
                  </div>
                </div>
              `;
            })
            .join('')}

          <!-- Add New Column Button -->
          <div class="shrink-0 w-[240px] pt-1 pr-4">
            <button type="button" data-action="open-add-column" class="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-800 hover:border-indigo-500/60 hover:bg-slate-100/60 dark:hover:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold text-xs transition-all">
              ${icon('Plus', 'w-4 h-4')} Adicionar Nova Coluna
            </button>
          </div>
        </div>
      `;
    }

    renderTaskListView() {
      const activeBoard = this.getActiveBoard();
      const { cards, columns, boards, labels, filters } = this.state;
      const baseCards = activeBoard
        ? cards.filter((c) => !c.isArchived && c.boardId === activeBoard.id)
        : cards.filter((c) => !c.isArchived);
      const filtered = this.filterCardsList(baseCards);

      return `
        <div class="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 max-w-7xl mx-auto w-full">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 class="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
                ${icon('ListTodo', 'w-6 h-6 text-indigo-500')}
                Visão em Lista — ${escapeHtml(activeBoard ? activeBoard.title : 'Todas as Tarefas')}
              </h1>
              <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Exibindo ${filtered.length} de ${baseCards.length} tarefas ativas deste quadro. Clique em qualquer linha para editar.
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <input
                type="text"
                data-input="filter-search"
                value="${escapeHtml(filters.search)}"
                placeholder="Filtrar tarefas na tabela..."
                class="text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              ${['urgent', 'high', 'medium', 'low']
                .map((p) => {
                  const active = filters.priorities.includes(p);
                  return `<button type="button" data-action="toggle-filter-priority" data-priority="${p}" class="px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-colors ${active ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'}">${PRIORITY_CONFIG[p].label}</button>`;
                })
                .join('')}
            </div>
          </div>

          <div class="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse text-xs">
                <thead>
                  <tr class="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th class="px-5 py-3.5">Tarefa</th>
                    <th class="px-4 py-3.5">Etapa / Coluna</th>
                    <th class="px-4 py-3.5">Prioridade</th>
                    <th class="px-4 py-3.5">Prazo</th>
                    <th class="px-4 py-3.5">Checklist</th>
                    <th class="px-4 py-3.5">Etiquetas</th>
                    <th class="px-4 py-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80">
                  ${filtered.length === 0 ? `
                    <tr>
                      <td colspan="7" class="px-5 py-12 text-center text-slate-400">Nenhuma tarefa encontrada com os filtros selecionados.</td>
                    </tr>
                  ` : filtered
                    .map((card) => {
                      const col = columns.find((c) => c.id === card.columnId);
                      const b = boards.find((item) => item.id === card.boardId);
                      const dueStatus = getDueStatus(card.dueDate, this.isColumnDone(col));
                      const cardLabels = labels.filter((l) => (card.labels || []).includes(l.id));
                      const totalSub = (card.checklists || []).length;
                      const doneSub = (card.checklists || []).filter((c) => c.completed).length;

                      return `
                        <tr data-action="open-card" data-card-id="${escapeHtml(card.id)}" class="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group">
                          <td class="px-5 py-3.5 max-w-[300px]">
                            <div class="font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">${escapeHtml(card.title)}</div>
                            ${card.description ? `<div class="text-[11px] text-slate-400 truncate mt-0.5">${escapeHtml(card.description)}</div>` : ''}
                          </td>
                          <td class="px-4 py-3.5 whitespace-nowrap">
                            <div class="inline-flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                              <span class="w-2.5 h-2.5 rounded-full" style="background-color:${col?.color || '#6366f1'}"></span>
                              ${escapeHtml(col?.title || 'Coluna')}
                            </div>
                            <div class="text-[10px] text-slate-400">${escapeHtml(b?.title || '')}</div>
                          </td>
                          <td class="px-4 py-3.5 whitespace-nowrap">${this.renderBadgePriority(card.priority, 'sm')}</td>
                          <td class="px-4 py-3.5 whitespace-nowrap">
                            ${dueStatus ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${dueStatus.badgeClass}">${icon('Calendar', 'w-3 h-3')} ${escapeHtml(dueStatus.relativeText)}</span>` : '<span class="text-slate-400">—</span>'}
                          </td>
                          <td class="px-4 py-3.5 whitespace-nowrap">
                            ${totalSub > 0 ? `<span class="font-semibold text-slate-700 dark:text-slate-300">${doneSub}/${totalSub}</span>` : '<span class="text-slate-400">—</span>'}
                          </td>
                          <td class="px-4 py-3.5">
                            <div class="flex flex-wrap gap-1 max-w-[220px]">
                              ${cardLabels.map((lbl) => this.renderBadgeLabel(lbl, 'sm')).join('')}
                            </div>
                          </td>
                          <td class="px-4 py-3.5 text-right whitespace-nowrap" data-stop-propagation="true">
                            <button type="button" data-action="open-card" data-card-id="${escapeHtml(card.id)}" class="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800" title="Editar tarefa">
                              ${icon('Edit2', 'w-4 h-4')}
                            </button>
                            <button type="button" data-action="confirm-delete-card" data-card-id="${escapeHtml(card.id)}" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40" title="Excluir tarefa">
                              ${icon('Trash2', 'w-4 h-4')}
                            </button>
                          </td>
                        </tr>
                      `;
                    })
                    .join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    }

    renderDashboardView() {
      const { boards, columns, cards, labels } = this.state;
      const activeBoards = boards.filter((b) => !b.isArchived);
      const activeCards = cards.filter((c) => !c.isArchived);
      const totalTasks = activeCards.length;

      const inProgressCards = activeCards.filter((c) => {
        const col = columns.find((col) => col.id === c.columnId);
        const t = (col?.title || '').toLowerCase();
        return t.includes('andamento') || t.includes('progress');
      });

      const completedCards = activeCards.filter((c) => {
        const col = columns.find((col) => col.id === c.columnId);
        return this.isColumnDone(col);
      });

      const overdueCards = activeCards.filter((c) => {
        const col = columns.find((col) => col.id === c.columnId);
        return getDueStatus(c.dueDate, this.isColumnDone(col))?.isOverdue;
      });

      const urgentCards = activeCards
        .filter((c) => {
          const col = columns.find((col) => col.id === c.columnId);
          return !this.isColumnDone(col) && (c.priority === 'urgent' || c.priority === 'high');
        })
        .slice(0, 8);

      const completionRate = totalTasks > 0 ? Math.round((completedCards.length / totalTasks) * 100) : 0;

      return `
        <div class="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8 max-w-7xl mx-auto w-full">
          <div>
            <h1 class="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
              ${icon('LayoutDashboard', 'w-6 h-6 text-indigo-500')}
              Painel Executivo de Projetos (Dashboard)
            </h1>
            <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Visão consolidada do progresso do TCC e dos quadros ativos salvos em <code class="text-indigo-500 font-mono">localStorage</code>.
            </p>
          </div>

          <!-- KPI Cards -->
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">Total de Tarefas</span>
                <div class="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">${icon('ListTodo', 'w-4 h-4')}</div>
              </div>
              <div class="text-2xl font-black text-slate-900 dark:text-slate-100">${totalTasks}</div>
              <span class="text-[11px] text-slate-400 mt-1 block">Em ${activeBoards.length} quadro(s) ativo(s)</span>
            </div>

            <div class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">Em Andamento</span>
                <div class="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">${icon('Clock', 'w-4 h-4')}</div>
              </div>
              <div class="text-2xl font-black text-amber-600 dark:text-amber-400">${inProgressCards.length}</div>
              <span class="text-[11px] text-slate-400 mt-1 block">Em desenvolvimento ativo</span>
            </div>

            <div class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">Concluídas (Done)</span>
                <div class="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">${icon('CheckCircle2', 'w-4 h-4')}</div>
              </div>
              <div class="text-2xl font-black text-emerald-600 dark:text-emerald-400">${completedCards.length}</div>
              <span class="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1 block">${completionRate}% de entrega concluída</span>
            </div>

            <div class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">Prazos Vencidos</span>
                <div class="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">${icon('AlertTriangle', 'w-4 h-4')}</div>
              </div>
              <div class="text-2xl font-black ${overdueCards.length > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'}">${overdueCards.length}</div>
              <span class="text-[11px] text-slate-400 mt-1 block">Pendentes fora do prazo</span>
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Active Boards List -->
            <div class="lg:col-span-2 space-y-4">
              <div class="flex items-center justify-between">
                <h2 class="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  ${icon('LayoutGrid', 'w-4 h-4 text-indigo-500')} Seus Quadros de Projetos (${activeBoards.length})
                </h2>
                <button type="button" data-action="open-create-board" class="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                  ${icon('Plus', 'w-3.5 h-3.5')} Novo Quadro
                </button>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                ${activeBoards
                  .map((b) => {
                    const bCards = activeCards.filter((c) => c.boardId === b.id);
                    const bDone = bCards.filter((c) => {
                      const col = columns.find((col) => col.id === c.columnId);
                      return this.isColumnDone(col);
                    }).length;
                    const pct = bCards.length > 0 ? Math.round((bDone / bCards.length) * 100) : 0;
                    const bCols = this.getBoardColumns(b.id);
                    const bColor = BOARD_COLORS.find((c) => c.id === b.color) || BOARD_COLORS[0];

                    return `
                      <div data-action="select-board-open" data-board-id="${escapeHtml(b.id)}" class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-500/50 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between space-y-4">
                        <div>
                          <div class="flex items-center justify-between gap-2 mb-2">
                            <span class="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${bColor.bg} ${bColor.text}">
                              <span class="w-2 h-2 rounded-full" style="background-color:${bColor.accent}"></span>
                              ${bCols.length} etapas
                            </span>
                            ${b.isFavorite ? `<span class="text-amber-400">${icon('Star', 'w-4 h-4')}</span>` : ''}
                          </div>
                          <h3 class="text-sm font-extrabold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">${escapeHtml(b.title)}</h3>
                          <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">${escapeHtml(b.description || 'Sem descrição')}</p>
                        </div>

                        <div class="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <div class="flex items-center justify-between text-xs font-semibold">
                            <span class="text-slate-500">${bDone} de ${bCards.length} concluídas</span>
                            <span class="text-emerald-600 dark:text-emerald-400 font-bold">${pct}%</span>
                          </div>
                          <div class="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div class="h-full bg-emerald-500 rounded-full transition-all duration-500" style="width:${pct}%"></div>
                          </div>
                        </div>
                      </div>
                    `;
                  })
                  .join('')}
              </div>
            </div>

            <!-- Priority / Urgent Tasks -->
            <div class="space-y-4">
              <h2 class="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                ${icon('Flame', 'w-4 h-4 text-rose-500')} Prioridade Alta & Urgente
              </h2>
              <div class="space-y-2.5">
                ${urgentCards.length === 0 ? `
                  <div class="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center text-xs text-slate-400">
                    Nenhuma tarefa urgente pendente!
                  </div>
                ` : urgentCards
                  .map((task) => {
                    const col = columns.find((c) => c.id === task.columnId);
                    const taskLabels = labels.filter((l) => (task.labels || []).includes(l.id));
                    return `
                      <div data-action="open-card" data-card-id="${escapeHtml(task.id)}" class="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500/40 shadow-xs cursor-pointer transition-all">
                        <div class="flex flex-wrap items-center gap-1.5 mb-1.5">
                          ${this.renderBadgePriority(task.priority, 'sm')}
                          ${taskLabels.slice(0, 2).map((lbl) => this.renderBadgeLabel(lbl, 'sm')).join('')}
                        </div>
                        <h4 class="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">${escapeHtml(task.title)}</h4>
                        <div class="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
                          <span class="flex items-center gap-1">
                            <span class="w-2 h-2 rounded-full" style="background-color:${col?.color || '#6366f1'}"></span>
                            ${escapeHtml(col?.title || '')}
                          </span>
                          ${task.checklists?.length ? `<span>${task.checklists.filter((c) => c.completed).length}/${task.checklists.length} chk</span>` : ''}
                        </div>
                      </div>
                    `;
                  })
                  .join('')}
              </div>
            </div>
          </div>
        </div>
      `;
    }

    renderAnalyticsView() {
      const { cards, columns, boards, analyticsBoardId } = this.state;
      const relevantCards =
        analyticsBoardId === 'all'
          ? cards.filter((c) => !c.isArchived)
          : cards.filter((c) => !c.isArchived && c.boardId === analyticsBoardId);

      const relevantColumns =
        analyticsBoardId === 'all'
          ? columns
          : columns.filter((col) => col.boardId === analyticsBoardId).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      const totalTasks = relevantCards.length;
      const priorityCounts = {
        urgent: relevantCards.filter((c) => c.priority === 'urgent').length,
        high: relevantCards.filter((c) => c.priority === 'high').length,
        medium: relevantCards.filter((c) => c.priority === 'medium').length,
        low: relevantCards.filter((c) => c.priority === 'low').length,
      };

      let totalSub = 0;
      let doneSub = 0;
      relevantCards.forEach((c) => {
        totalSub += (c.checklists || []).length;
        doneSub += (c.checklists || []).filter((chk) => chk.completed).length;
      });
      const subtaskRate = totalSub > 0 ? Math.round((doneSub / totalSub) * 100) : 0;

      const completedTasks = relevantCards.filter((c) => {
        const col = columns.find((colItem) => colItem.id === c.columnId);
        return this.isColumnDone(col);
      }).length;

      const inProgressTasks = relevantCards.filter((c) => {
        const col = columns.find((colItem) => colItem.id === c.columnId);
        const t = (col?.title || '').toLowerCase();
        return t.includes('andamento') || t.includes('progress');
      }).length;

      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return `
        <div class="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8 max-w-7xl mx-auto w-full">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 class="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
                ${icon('BarChart3', 'w-6 h-6 text-indigo-500')}
                Métricas de Produtividade & Ciclo de Vida
              </h1>
              <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Estatísticas de execução, distribuição por etapas do fluxo e progresso de subtarefas.
              </p>
            </div>

            <div class="min-w-[240px]">
              <select data-change="analytics-board" class="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-xs">
                <option value="all" ${analyticsBoardId === 'all' ? 'selected' : ''}>Todos os Quadros (${cards.filter((c) => !c.isArchived).length} tarefas)</option>
                ${boards
                  .filter((b) => !b.isArchived)
                  .map(
                    (b) => `
                      <option value="${escapeHtml(b.id)}" ${analyticsBoardId === b.id ? 'selected' : ''}>
                        ${escapeHtml(b.title)}
                      </option>
                    `
                  )
                  .join('')}
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-4">
              <div class="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">${icon('Award', 'w-6 h-6')}</div>
              <div>
                <div class="text-2xl font-black text-slate-900 dark:text-slate-100">${completionRate}%</div>
                <div class="text-xs font-semibold text-slate-500">Taxa de Conclusão (${completedTasks}/${totalTasks})</div>
              </div>
            </div>

            <div class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-4">
              <div class="p-3 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">${icon('ListOrdered', 'w-6 h-6')}</div>
              <div>
                <div class="text-2xl font-black text-slate-900 dark:text-slate-100">${subtaskRate}%</div>
                <div class="text-xs font-semibold text-slate-500">Subtarefas Feitas (${doneSub}/${totalSub})</div>
              </div>
            </div>

            <div class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-4">
              <div class="p-3 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">${icon('Clock', 'w-6 h-6')}</div>
              <div>
                <div class="text-2xl font-black text-amber-600 dark:text-amber-400">${inProgressTasks}</div>
                <div class="text-xs font-semibold text-slate-500">Em Andamento / Execução</div>
              </div>
            </div>

            <div class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-4">
              <div class="p-3 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400">${icon('CheckSquare', 'w-6 h-6')}</div>
              <div>
                <div class="text-2xl font-black text-purple-600 dark:text-purple-400">${totalTasks}</div>
                <div class="text-xs font-semibold text-slate-500">Total Analisado</div>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Distribution by Priority -->
            <div class="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                ${icon('Flame', 'w-4 h-4 text-rose-500')} Distribuição por Nível de Prioridade
              </h3>
              <div class="space-y-3 pt-2">
                ${['urgent', 'high', 'medium', 'low']
                  .map((p) => {
                    const conf = PRIORITY_CONFIG[p];
                    const count = priorityCounts[p];
                    const pct = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0;
                    return `
                      <div class="space-y-1.5">
                        <div class="flex items-center justify-between text-xs font-semibold">
                          <span class="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                            <span class="w-2.5 h-2.5 rounded-full" style="background-color:${conf.dotColor}"></span>
                            ${conf.label}
                          </span>
                          <span class="text-slate-500 dark:text-slate-400">${count} tarefas (${pct}%)</span>
                        </div>
                        <div class="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div class="h-full rounded-full transition-all duration-500" style="width:${pct}%; background-color:${conf.dotColor}"></div>
                        </div>
                      </div>
                    `;
                  })
                  .join('')}
              </div>
            </div>

            <!-- Distribution by Workflow Columns -->
            <div class="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                ${icon('PieChart', 'w-4 h-4 text-indigo-500')} Distribuição por Etapas do Fluxo
              </h3>
              <div class="space-y-3 pt-2">
                ${relevantColumns
                  .map((col) => {
                    const colCards = relevantCards.filter((c) => c.columnId === col.id);
                    const pct = totalTasks > 0 ? Math.round((colCards.length / totalTasks) * 100) : 0;
                    const b = boards.find((item) => item.id === col.boardId);
                    return `
                      <div class="space-y-1.5">
                        <div class="flex items-center justify-between text-xs font-semibold">
                          <span class="flex items-center gap-2 text-slate-700 dark:text-slate-300 truncate max-w-[260px]">
                            <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color:${col.color || '#6366f1'}"></span>
                            <span class="truncate">${escapeHtml(col.title)}</span>
                            ${analyticsBoardId === 'all' ? `<span class="text-slate-400 font-normal text-[10px]">(${escapeHtml(b?.title || '')})</span>` : ''}
                          </span>
                          <span class="text-slate-500 dark:text-slate-400">${colCards.length} (${pct}%)</span>
                        </div>
                        <div class="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div class="h-full rounded-full transition-all duration-500" style="width:${pct}%; background-color:${col.color || '#6366f1'}"></div>
                        </div>
                      </div>
                    `;
                  })
                  .join('')}
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // --- MODALS RENDERING (<dialog closedby="any"> + showModal) ---
    renderCardDetailModal() {
      const { selectedCardId, cards, labels, activities, isCreatingLabel, newLabelColor, isAddingLink } = this.state;
      if (!selectedCardId) return '';
      const card = cards.find((c) => c.id === selectedCardId);
      if (!card) return '';

      const boardCols = this.getBoardColumns(card.boardId);
      const col = boardCols.find((c) => c.id === card.columnId);
      const dueStatus = getDueStatus(card.dueDate, this.isColumnDone(col));
      const totalSub = (card.checklists || []).length;
      const doneSub = (card.checklists || []).filter((c) => c.completed).length;
      const subPct = totalSub > 0 ? Math.round((doneSub / totalSub) * 100) : 0;
      const cardActs = activities.filter((a) => a.cardId === card.id).slice(0, 15);

      return `
        <dialog id="active-modal-dialog" closedby="any" aria-labelledby="modal-card-title" class="kanban-dialog">
          <div class="w-full max-h-[88vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <!-- Modal Header -->
            <div class="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-slate-50/60 dark:bg-slate-900/60 shrink-0">
              <div class="flex items-center gap-2">
                <span class="text-xs font-semibold text-slate-500">Etapa:</span>
                <select data-change="modal-card-column" data-card-id="${escapeHtml(card.id)}" class="text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                  ${boardCols
                    .map(
                      (c) => `<option value="${escapeHtml(c.id)}" ${c.id === card.columnId ? 'selected' : ''}>${escapeHtml(c.title)}</option>`
                    )
                    .join('')}
                </select>
              </div>

              <div class="flex items-center gap-1.5">
                <button type="button" data-action="duplicate-card" data-card-id="${escapeHtml(card.id)}" class="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800" title="Duplicar tarefa">
                  ${icon('Copy', 'w-4 h-4')}
                </button>
                <button type="button" data-action="archive-card" data-card-id="${escapeHtml(card.id)}" class="p-1.5 rounded-lg text-slate-500 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800" title="Arquivar tarefa">
                  ${icon('Archive', 'w-4 h-4')}
                </button>
                <button type="button" data-action="confirm-delete-card" data-card-id="${escapeHtml(card.id)}" class="p-1.5 rounded-lg text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40" title="Excluir tarefa">
                  ${icon('Trash2', 'w-4 h-4')}
                </button>
                <button type="button" data-action="close-modal" class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 ml-1" title="Fechar (Esc)">
                  ${icon('X', 'w-4 h-4')}
                </button>
              </div>
            </div>

            <!-- Modal Body -->
            <div class="flex-1 overflow-y-auto p-5 space-y-5">
              <!-- Title & Description -->
              <div class="space-y-3">
                <div>
                  <label id="modal-card-title" class="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Título da Tarefa</label>
                  <input
                    type="text"
                    data-blur="modal-card-title"
                    data-card-id="${escapeHtml(card.id)}"
                    value="${escapeHtml(card.title)}"
                    class="w-full text-base sm:text-lg font-extrabold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Descrição Detalhada</label>
                  <textarea
                    rows="3"
                    data-blur="modal-card-desc"
                    data-card-id="${escapeHtml(card.id)}"
                    placeholder="Descreva o objetivo técnico, escopo ou critérios de aceitação..."
                    class="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 outline-hidden focus:ring-2 focus:ring-indigo-500 resize-y"
                  >${escapeHtml(card.description || '')}</textarea>
                </div>
              </div>

              <!-- Priority & Due Date Grid -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">Prioridade</label>
                  <div class="grid grid-cols-2 gap-1.5">
                    ${['low', 'medium', 'high', 'urgent']
                      .map((p) => {
                        const conf = PRIORITY_CONFIG[p];
                        const isSel = card.priority === p;
                        return `
                          <button type="button" data-action="set-card-priority" data-card-id="${escapeHtml(card.id)}" data-priority="${p}" class="px-2.5 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 transition-all ${isSel ? `${conf.badgeBg} ${conf.border} ring-2 ring-indigo-500/40` : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}">
                            <span class="w-2 h-2 rounded-full" style="background-color:${conf.dotColor}"></span>
                            ${conf.label}
                          </button>
                        `;
                      })
                      .join('')}
                  </div>
                </div>

                <div class="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <div class="flex items-center justify-between mb-2">
                    <label class="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      ${icon('Calendar', 'w-3.5 h-3.5 text-indigo-500')} Prazo de Entrega
                    </label>
                    ${dueStatus ? `<span class="text-[10px] font-bold px-2 py-0.5 rounded-md ${dueStatus.badgeClass}">${escapeHtml(dueStatus.relativeText)}</span>` : ''}
                  </div>
                  <div class="flex items-center gap-2">
                    <input type="date" data-change="modal-card-duedate" data-card-id="${escapeHtml(card.id)}" value="${escapeHtml(card.dueDate || '')}" class="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" />
                    ${card.dueDate ? `
                      <button type="button" data-action="clear-card-duedate" data-card-id="${escapeHtml(card.id)}" class="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800" title="Remover prazo">
                        ${icon('Trash', 'w-3.5 h-3.5')}
                      </button>
                    ` : ''}
                  </div>
                </div>
              </div>

              <!-- Labels -->
              <div class="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2.5">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    ${icon('Tag', 'w-3.5 h-3.5 text-indigo-500')} Etiquetas / Categorias
                  </span>
                  <button type="button" data-action="toggle-create-label" class="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                    ${icon('Plus', 'w-3.5 h-3.5')} Nova Etiqueta
                  </button>
                </div>

                <div class="flex flex-wrap gap-1.5">
                  ${labels
                    .map((lbl) => {
                      const isSel = (card.labels || []).includes(lbl.id);
                      const c = LABEL_COLORS[lbl.color] || LABEL_COLORS.indigo;
                      return `
                        <button type="button" data-action="toggle-card-label" data-card-id="${escapeHtml(card.id)}" data-label-id="${escapeHtml(lbl.id)}" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${isSel ? `${c.bg} ${c.border} ring-2 ring-indigo-500/40 font-bold` : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}">
                          <span class="w-2 h-2 rounded-full ${c.dot}"></span>
                          ${escapeHtml(lbl.name)}
                        </button>
                      `;
                    })
                    .join('')}
                </div>

                ${isCreatingLabel ? `
                  <form data-form="create-label" data-card-id="${escapeHtml(card.id)}" class="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-2">
                    <div class="flex items-center gap-2">
                      <input type="text" name="labelName" placeholder="Nome da etiqueta..." required class="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
                      <button type="submit" class="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold">Criar</button>
                    </div>
                    <div class="flex items-center gap-1.5">
                      ${Object.entries(LABEL_COLORS)
                        .map(
                          ([key, val]) => `
                            <button type="button" data-action="pick-label-color" data-color="${key}" class="w-5 h-5 rounded-full ${val.dot} ${newLabelColor === key ? 'ring-2 ring-offset-2 ring-indigo-500' : ''}"></button>
                          `
                        )
                        .join('')}
                    </div>
                  </form>
                ` : ''}
              </div>

              <!-- Subtasks / Checklist -->
              <div class="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    ${icon('CheckSquare', 'w-3.5 h-3.5 text-indigo-500')} Checklist de Subtarefas (${doneSub}/${totalSub})
                  </span>
                  ${totalSub > 0 ? `<span class="text-xs font-bold ${doneSub === totalSub ? 'text-emerald-500' : 'text-indigo-500'}">${subPct}%</span>` : ''}
                </div>

                ${totalSub > 0 ? `
                  <div class="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div class="h-full transition-all duration-300 rounded-full ${doneSub === totalSub ? 'bg-emerald-500' : 'bg-indigo-500'}" style="width:${subPct}%"></div>
                  </div>
                ` : ''}

                <div class="space-y-1.5">
                  ${(card.checklists || [])
                    .map(
                      (item) => `
                        <div class="flex items-center justify-between gap-2 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/70 group">
                          <label class="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer select-none">
                            <input type="checkbox" data-action="toggle-subtask-inline" data-card-id="${escapeHtml(card.id)}" data-subtask-id="${escapeHtml(item.id)}" ${item.completed ? 'checked' : ''} class="w-4 h-4 rounded text-indigo-600 cursor-pointer shrink-0" />
                            <span class="text-xs font-medium ${item.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'}">${escapeHtml(item.text)}</span>
                          </label>
                          <button type="button" data-action="delete-subtask" data-card-id="${escapeHtml(card.id)}" data-subtask-id="${escapeHtml(item.id)}" class="p-1 text-slate-400 hover:text-rose-500" title="Remover item">
                            ${icon('Trash', 'w-3.5 h-3.5')}
                          </button>
                        </div>
                      `
                    )
                    .join('')}
                </div>

                <form data-form="add-subtask" data-card-id="${escapeHtml(card.id)}" class="flex items-center gap-2">
                  <input type="text" name="subtaskText" placeholder="Adicionar item ao checklist..." required class="flex-1 text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-hidden focus:ring-2 focus:ring-indigo-500" />
                  <button type="submit" class="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold">Adicionar</button>
                </form>
              </div>

              <!-- Technical Notes -->
              <div class="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  ${icon('FileText', 'w-3.5 h-3.5 text-indigo-500')} Notas Técnicas & Observações
                </label>
                <textarea
                  rows="2"
                  data-blur="modal-card-notes"
                  data-card-id="${escapeHtml(card.id)}"
                  placeholder="Anotações de engenharia, fórmulas, referências ou observações..."
                  class="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-hidden focus:ring-2 focus:ring-indigo-500"
                >${escapeHtml(card.notes || '')}</textarea>
              </div>

              <!-- Links & References -->
              <div class="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2.5">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    ${icon('Link2', 'w-3.5 h-3.5 text-indigo-500')} Links e Referências (${(card.links || []).length})
                  </span>
                  <button type="button" data-action="toggle-add-link" class="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                    ${icon('Plus', 'w-3.5 h-3.5')} Adicionar Link
                  </button>
                </div>

                ${(card.links || []).length > 0 ? `
                  <div class="space-y-1.5">
                    ${(card.links || [])
                      .map(
                        (lnk) => `
                          <div class="flex items-center justify-between gap-2 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-xs">
                            <a href="${escapeHtml(lnk.url)}" target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:underline font-semibold truncate">
                              ${icon('ExternalLink', 'w-3.5 h-3.5 shrink-0')}
                              <span class="truncate">${escapeHtml(lnk.title || lnk.url)}</span>
                            </a>
                            <button type="button" data-action="delete-card-link" data-card-id="${escapeHtml(card.id)}" data-link-id="${escapeHtml(lnk.id)}" class="p-1 text-slate-400 hover:text-rose-500">
                              ${icon('Trash', 'w-3.5 h-3.5')}
                            </button>
                          </div>
                        `
                      )
                      .join('')}
                  </div>
                ` : ''}

                ${isAddingLink ? `
                  <form data-form="add-card-link" data-card-id="${escapeHtml(card.id)}" class="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                    <input type="text" name="linkTitle" placeholder="Título do link" class="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
                    <input type="text" name="linkUrl" placeholder="https://..." required class="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
                    <button type="submit" class="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold">Anexar Link</button>
                  </form>
                ` : ''}
              </div>

              <!-- Activity History -->
              ${cardActs.length > 0 ? `
                <div class="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <h4 class="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 mb-2">
                    ${icon('History', 'w-3.5 h-3.5 text-slate-400')} Histórico de Alterações
                  </h4>
                  <div class="space-y-1.5 max-h-32 overflow-y-auto pr-2">
                    ${cardActs
                      .map(
                        (a) => `
                          <div class="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                            <span class="truncate">• ${escapeHtml(a.details)}</span>
                            <span class="text-[10px] text-slate-400 shrink-0 ml-2">${formatFullDate(a.timestamp)}</span>
                          </div>
                        `
                      )
                      .join('')}
                  </div>
                </div>
              ` : ''}
            </div>

            <!-- Modal Footer -->
            <div class="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2 shrink-0">
              <span>Atualizado em: ${formatFullDate(card.updatedAt)}</span>
              <button type="button" data-action="close-modal" class="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs">Concluir Edição</button>
            </div>
          </div>
        </dialog>
      `;
    }

    renderBoardModal() {
      const { boardModal, boards } = this.state;
      if (!boardModal.isOpen) return '';
      const editing = boardModal.editingBoardId ? boards.find((b) => b.id === boardModal.editingBoardId) : null;
      const selectedColor = boardModal.color || editing?.color || 'indigo';

      return `
        <dialog id="active-modal-dialog" closedby="any" aria-labelledby="modal-board-title" class="kanban-dialog" style="max-width: 32rem;">
          <div class="w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div class="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <div class="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">${icon('LayoutGrid', 'w-5 h-5')}</div>
                <div>
                  <h3 id="modal-board-title" class="text-sm font-extrabold text-slate-900 dark:text-slate-100">${editing ? 'Editar Quadro' : 'Novo Quadro de Projeto'}</h3>
                  <p class="text-[11px] text-slate-400">Estrutura automática com 5 etapas de ciclo de vida.</p>
                </div>
              </div>
              <button type="button" data-action="close-modal" class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">${icon('X', 'w-4 h-4')}</button>
            </div>

            <form data-form="save-board" class="p-5 space-y-4">
              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nome do Quadro *</label>
                <input type="text" name="title" value="${escapeHtml(editing ? editing.title : '')}" placeholder="Ex: Sprint 01 — Desenvolvimento" required autofocus class="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-hidden focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Descrição</label>
                <textarea rows="2" name="description" placeholder="Objetivo principal, escopo ou observações..." class="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-hidden focus:ring-2 focus:ring-indigo-500">${escapeHtml(editing ? editing.description || '' : '')}</textarea>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Tema de Cor</label>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  ${BOARD_COLORS.map((c) => {
                    const isSel = selectedColor === c.id;
                    return `
                      <button type="button" data-action="pick-board-color" data-color="${c.id}" class="flex items-center gap-2 p-2 rounded-xl border text-left text-xs font-semibold transition-all ${isSel ? `${c.bg} ${c.border} ring-2 ring-indigo-500 font-bold` : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}">
                        <span class="w-3 h-3 rounded-full shrink-0" style="background-color:${c.accent}"></span>
                        <span class="truncate">${c.name}</span>
                      </button>
                    `;
                  }).join('')}
                </div>
              </div>

              <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button type="button" data-action="close-modal" class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">Cancelar</button>
                <button type="submit" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20">${editing ? 'Salvar Alterações' : 'Criar Quadro'}</button>
              </div>
            </form>
          </div>
        </dialog>
      `;
    }

    renderAddColumnModal() {
      const { columnModal } = this.state;
      if (!columnModal.isOpen) return '';

      return `
        <dialog id="active-modal-dialog" closedby="any" aria-labelledby="modal-col-title" class="kanban-dialog" style="max-width: 28rem;">
          <div class="w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div class="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <div class="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">${icon('Columns', 'w-5 h-5')}</div>
                <h3 id="modal-col-title" class="text-sm font-extrabold text-slate-900 dark:text-slate-100">Nova Etapa / Coluna</h3>
              </div>
              <button type="button" data-action="close-modal" class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">${icon('X', 'w-4 h-4')}</button>
            </div>

            <form data-form="save-column" class="p-5 space-y-4">
              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nome da Coluna *</label>
                <input type="text" name="title" placeholder="Ex: Homologação / QA" required autofocus class="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-hidden focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Subtítulo / Descrição Curta (Opcional)</label>
                <input type="text" name="subtitle" placeholder="Ex: Validação e testes finais" class="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-hidden" />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Cor de Destaque</label>
                <div class="flex flex-wrap gap-2">
                  ${COLUMN_COLORS.map((c) => `
                    <button type="button" data-action="pick-column-color" data-color="${c}" class="w-7 h-7 rounded-full transition-transform ${columnModal.color === c ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : 'hover:scale-105'}" style="background-color:${c}"></button>
                  `).join('')}
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Limite WIP de Tarefas (Opcional)</label>
                <input type="number" name="cardLimit" min="1" max="100" placeholder="Ex: 5 (deixe vazio para sem limite)" class="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-hidden" />
              </div>

              <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button type="button" data-action="close-modal" class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">Cancelar</button>
                <button type="submit" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold">Criar Coluna</button>
              </div>
            </form>
          </div>
        </dialog>
      `;
    }

    renderGlobalSearchModal() {
      const { isGlobalSearchOpen, globalSearchQuery, cards, boards, columns } = this.state;
      if (!isGlobalSearchOpen) return '';
      const q = (globalSearchQuery || '').trim().toLowerCase();

      const matchingCards = q
        ? cards
            .filter((c) => {
              if (c.isArchived) return false;
              return (
                (c.title || '').toLowerCase().includes(q) ||
                (c.description || '').toLowerCase().includes(q) ||
                (c.notes || '').toLowerCase().includes(q) ||
                (c.checklists || []).some((chk) => (chk.text || '').toLowerCase().includes(q))
              );
            })
            .slice(0, 12)
        : cards.filter((c) => !c.isArchived).slice(0, 6);

      return `
        <dialog id="active-modal-dialog" closedby="any" aria-label="Busca Global" class="kanban-dialog" style="max-width: 38rem;">
          <div class="w-full max-h-[80vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div class="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 bg-slate-50/50 dark:bg-slate-900/50">
              ${icon('Search', 'w-5 h-5 text-indigo-500')}
              <input
                type="text"
                id="global-search-input"
                data-input="global-search"
                value="${escapeHtml(globalSearchQuery)}"
                placeholder="Buscar tarefas, descrições, subtarefas ou notas..."
                autofocus
                class="w-full text-sm font-medium bg-transparent text-slate-900 dark:text-slate-100 outline-hidden"
              />
              <button type="button" data-action="close-modal" class="px-2 py-1 text-[10px] font-mono bg-slate-200/70 dark:bg-slate-800 text-slate-500 rounded">Esc</button>
            </div>

            <div class="flex-1 overflow-y-auto p-3 space-y-1.5">
              <div class="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                ${q ? `Resultados encontrados (${matchingCards.length})` : 'Tarefas Recentes / Sugeridas'}
              </div>
              ${matchingCards.length === 0 ? `
                <div class="py-10 text-center text-xs text-slate-400">Nenhum resultado encontrado para "${escapeHtml(globalSearchQuery)}".</div>
              ` : matchingCards
                .map((c) => {
                  const col = columns.find((col) => col.id === c.columnId);
                  const b = boards.find((board) => board.id === c.boardId);
                  return `
                    <button type="button" data-action="open-card-from-search" data-card-id="${escapeHtml(c.id)}" data-board-id="${escapeHtml(c.boardId)}" class="w-full p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 flex items-center justify-between gap-3 text-left transition-colors">
                      <div class="min-w-0 flex-1">
                        <div class="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">${escapeHtml(c.title)}</div>
                        <div class="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span>${escapeHtml(b?.title || '')}</span>
                          <span>→</span>
                          <span class="font-semibold text-indigo-500">${escapeHtml(col?.title || '')}</span>
                        </div>
                      </div>
                      ${this.renderBadgePriority(c.priority, 'sm')}
                    </button>
                  `;
                })
                .join('')}
            </div>
          </div>
        </dialog>
      `;
    }

    renderArchiveModal() {
      const { isArchiveModalOpen, archiveTab, cards, boards } = this.state;
      if (!isArchiveModalOpen) return '';
      const archivedCards = cards.filter((c) => c.isArchived);
      const archivedBoards = boards.filter((b) => b.isArchived);

      return `
        <dialog id="active-modal-dialog" closedby="any" aria-labelledby="modal-archive-title" class="kanban-dialog" style="max-width: 36rem;">
          <div class="w-full max-h-[82vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div class="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <div class="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">${icon('Archive', 'w-5 h-5')}</div>
                <div>
                  <h3 id="modal-archive-title" class="text-sm font-extrabold text-slate-900 dark:text-slate-100">Central de Arquivos</h3>
                  <p class="text-[11px] text-slate-400">Restaure ou exclua permanentemente itens arquivados.</p>
                </div>
              </div>
              <button type="button" data-action="close-modal" class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">${icon('X', 'w-4 h-4')}</button>
            </div>

            <div class="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <button type="button" data-action="set-archive-tab" data-tab="cards" class="px-3 py-1.5 rounded-xl text-xs font-bold ${archiveTab === 'cards' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}">
                Tarefas Arquivadas (${archivedCards.length})
              </button>
              <button type="button" data-action="set-archive-tab" data-tab="boards" class="px-3 py-1.5 rounded-xl text-xs font-bold ${archiveTab === 'boards' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}">
                Quadros Arquivados (${archivedBoards.length})
              </button>
            </div>

            <div class="flex-1 overflow-y-auto p-4 space-y-2">
              ${archiveTab === 'cards' ? (
                archivedCards.length === 0 ? `<div class="py-10 text-center text-xs text-slate-400">Nenhuma tarefa arquivada no momento.</div>` :
                archivedCards.map((c) => `
                  <div class="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <div class="min-w-0 flex-1">
                      <div class="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">${escapeHtml(c.title)}</div>
                      <div class="text-[10px] text-slate-400">Atualizado em ${formatFullDate(c.updatedAt)}</div>
                    </div>
                    <div class="flex items-center gap-1">
                      <button type="button" data-action="restore-card" data-card-id="${escapeHtml(c.id)}" class="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-500/20">Restaurar</button>
                      <button type="button" data-action="confirm-delete-card" data-card-id="${escapeHtml(c.id)}" class="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10">${icon('Trash2', 'w-4 h-4')}</button>
                    </div>
                  </div>
                `).join('')
              ) : (
                archivedBoards.length === 0 ? `<div class="py-10 text-center text-xs text-slate-400">Nenhum quadro arquivado no momento.</div>` :
                archivedBoards.map((b) => `
                  <div class="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <div class="min-w-0 flex-1">
                      <div class="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">${escapeHtml(b.title)}</div>
                      <div class="text-[10px] text-slate-400">Arquivado em ${formatFullDate(b.updatedAt)}</div>
                    </div>
                    <div class="flex items-center gap-1">
                      <button type="button" data-action="restore-board" data-board-id="${escapeHtml(b.id)}" class="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-500/20">Restaurar</button>
                      <button type="button" data-action="confirm-delete-board" data-board-id="${escapeHtml(b.id)}" class="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10">${icon('Trash2', 'w-4 h-4')}</button>
                    </div>
                  </div>
                `).join('')
              )}
            </div>
          </div>
        </dialog>
      `;
    }

    renderBackupModal() {
      const { isBackupModalOpen, boards, cards, importedBackupData, importMode, importError } = this.state;
      if (!isBackupModalOpen) return '';
      const stats = dbService.getStorageStats();

      return `
        <dialog id="active-modal-dialog" closedby="any" aria-labelledby="modal-backup-title" class="kanban-dialog" style="max-width: 34rem;">
          <div class="w-full max-h-[86vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div class="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <div class="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">${icon('Database', 'w-5 h-5')}</div>
                <div>
                  <h3 id="modal-backup-title" class="text-sm font-extrabold text-slate-900 dark:text-slate-100">Persistência Local & Backup</h3>
                  <p class="text-[11px] text-slate-400">Armazenamento 100% Client-Side via <code class="text-indigo-500">localStorage</code></p>
                </div>
              </div>
              <button type="button" data-action="close-modal" class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">${icon('X', 'w-4 h-4')}</button>
            </div>

            <div class="flex-1 overflow-y-auto p-5 space-y-5">
              <!-- Storage status banner -->
              <div class="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="p-2 rounded-lg bg-indigo-600 text-white">${icon('HardDrive', 'w-4 h-4')}</div>
                  <div>
                    <div class="text-xs font-bold text-slate-900 dark:text-slate-100">Motor Ativo: ${escapeHtml(stats.engine)}</div>
                    <div class="text-[11px] text-slate-500 dark:text-slate-400">${boards.length} quadros • ${cards.length} tarefas (${stats.kilobytes} KB usados)</div>
                  </div>
                </div>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">Online/Offline</span>
              </div>

              <!-- Export Section -->
              <div class="space-y-2">
                <h4 class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Exportar Dados</h4>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button type="button" data-action="export-json" class="flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20">
                    ${icon('Download', 'w-4 h-4')} Backup Completo (.json)
                  </button>
                  <button type="button" data-action="export-markdown" class="flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs">
                    ${icon('FileText', 'w-4 h-4 text-indigo-500')} Relatório do Quadro (.md)
                  </button>
                </div>
              </div>

              <!-- Import Section -->
              <div class="space-y-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <h4 class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Importar Backup (.json)</h4>
                <input type="file" accept=".json" data-change="import-backup-file" class="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 dark:file:bg-indigo-950/60 file:text-indigo-700 dark:file:text-indigo-300 cursor-pointer" />

                ${importError ? `<div class="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">${escapeHtml(importError)}</div>` : ''}

                ${importedBackupData ? `
                  <div class="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-2.5">
                    <div class="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      ${icon('FileCheck', 'w-4 h-4')} Backup reconhecido (${importedBackupData.boards?.length || 0} quadros, ${importedBackupData.cards?.length || 0} tarefas)
                    </div>
                    <div class="flex items-center gap-4 text-xs font-semibold">
                      <label class="flex items-center gap-1.5 cursor-pointer">
                        <input type="radio" name="importMode" value="replace" data-change="set-import-mode" ${importMode === 'replace' ? 'checked' : ''} /> Substituir Tudo
                      </label>
                      <label class="flex items-center gap-1.5 cursor-pointer">
                        <input type="radio" name="importMode" value="merge" data-change="set-import-mode" ${importMode === 'merge' ? 'checked' : ''} /> Mesclar Dados
                      </label>
                    </div>
                    <button type="button" data-action="execute-import" class="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold">Confirmar Importação</button>
                  </div>
                ` : ''}
              </div>

              <!-- Reset / Clear Section -->
              <div class="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <h4 class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Manutenção do Armazenamento</h4>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button type="button" data-action="confirm-reset-demo" class="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
                    ${icon('RotateCcw', 'w-3.5 h-3.5')} Restaurar Dados Padrão
                  </button>
                  <button type="button" data-action="confirm-clear-all" class="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold text-rose-600 dark:text-rose-400">
                    ${icon('Trash2', 'w-3.5 h-3.5')} Limpar localStorage
                  </button>
                </div>
              </div>
            </div>
          </div>
        </dialog>
      `;
    }

    renderShortcutsModal() {
      if (!this.state.isShortcutsModalOpen) return '';
      const shortcuts = [
        { key: 'Ctrl + K / ⌘ + K', desc: 'Abrir Busca Global de Tarefas' },
        { key: 'N', desc: 'Criar Nova Tarefa rapidamente' },
        { key: 'B', desc: 'Criar Novo Quadro' },
        { key: 'D', desc: 'Alternar Tema Escuro / Claro' },
        { key: '1 / 2 / 3 / 4', desc: 'Alternar entre Kanban, Lista, Dashboard e Métricas' },
        { key: 'Esc', desc: 'Fechar janelas e menus abertos' },
        { key: '?', desc: 'Abrir ajuda de atalhos de teclado' },
      ];

      return `
        <dialog id="active-modal-dialog" closedby="any" aria-labelledby="modal-shortcuts-title" class="kanban-dialog" style="max-width: 30rem;">
          <div class="w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div class="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <div class="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">${icon('Keyboard', 'w-5 h-5')}</div>
                <h3 id="modal-shortcuts-title" class="text-sm font-extrabold text-slate-900 dark:text-slate-100">Atalhos de Teclado</h3>
              </div>
              <button type="button" data-action="close-modal" class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">${icon('X', 'w-4 h-4')}</button>
            </div>
            <div class="p-5 space-y-2.5">
              ${shortcuts
                .map(
                  (s) => `
                    <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
                      <span class="font-medium text-slate-700 dark:text-slate-300">${escapeHtml(s.desc)}</span>
                      <kbd class="px-2 py-1 text-[11px] font-mono font-bold bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">${escapeHtml(s.key)}</kbd>
                    </div>
                  `
                )
                .join('')}
            </div>
          </div>
        </dialog>
      `;
    }

    renderConfirmDialog() {
      const { confirmDialog } = this.state;
      if (!confirmDialog) return '';

      return `
        <dialog id="active-modal-dialog" closedby="any" aria-labelledby="modal-confirm-title" class="kanban-dialog" style="max-width: 26rem;">
          <div class="w-full p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div class="flex items-start gap-3">
              <div class="p-2.5 rounded-xl ${confirmDialog.isDestructive ? 'bg-rose-500/10 text-rose-500' : 'bg-indigo-500/10 text-indigo-500'} shrink-0">
                ${icon('AlertTriangle', 'w-5 h-5')}
              </div>
              <div>
                <h3 id="modal-confirm-title" class="text-sm font-extrabold text-slate-900 dark:text-slate-100">${escapeHtml(confirmDialog.title)}</h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">${escapeHtml(confirmDialog.message)}</p>
              </div>
            </div>
            <div class="flex justify-end gap-2 pt-2">
              <button type="button" data-action="close-confirm" class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">Cancelar</button>
              <button type="button" data-action="execute-confirm" class="px-4 py-2 rounded-xl text-xs font-bold text-white ${confirmDialog.isDestructive ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'}">${escapeHtml(confirmDialog.confirmText || 'Confirmar')}</button>
            </div>
          </div>
        </dialog>
      `;
    }

    closeAllModals() {
      this.state.selectedCardId = null;
      this.state.isCreatingLabel = false;
      this.state.isAddingLink = false;
      this.state.boardModal.isOpen = false;
      this.state.columnModal.isOpen = false;
      this.state.isGlobalSearchOpen = false;
      this.state.isArchiveModalOpen = false;
      this.state.isBackupModalOpen = false;
      this.state.isShortcutsModalOpen = false;
      this.state.confirmDialog = null;
      this.render();
    }

    syncModalDialogElement() {
      const dialog = document.getElementById('active-modal-dialog');
      if (!dialog) return;

      if (typeof dialog.showModal === 'function' && !dialog.open) {
        try {
          dialog.showModal();
        } catch {
          dialog.setAttribute('open', '');
        }
      }

      dialog.addEventListener('close', () => {
        if (
          this.state.selectedCardId ||
          this.state.boardModal.isOpen ||
          this.state.columnModal.isOpen ||
          this.state.isGlobalSearchOpen ||
          this.state.isArchiveModalOpen ||
          this.state.isBackupModalOpen ||
          this.state.isShortcutsModalOpen ||
          this.state.confirmDialog
        ) {
          this.closeAllModals();
        }
      });

      // Fallback for browsers without <dialog closedby="any"> support
      if (typeof HTMLDialogElement !== 'undefined' && !('closedBy' in HTMLDialogElement.prototype)) {
        dialog.addEventListener('click', (event) => {
          if (event.target !== dialog) return;
          const rect = dialog.getBoundingClientRect();
          const isDialogContent =
            rect.top <= event.clientY &&
            event.clientY <= rect.top + rect.height &&
            rect.left <= event.clientX &&
            event.clientX <= rect.left + rect.width;
          if (isDialogContent) return;
          dialog.close();
        });
      }
    }

    // --- MAIN RENDER ---
    render() {
      const appEl = document.getElementById('app');
      if (!appEl) return;

      // Preserve active search input focus if typing
      const activeEl = document.activeElement;
      const activeInputAttr = activeEl?.getAttribute?.('data-input');
      const selStart = activeEl?.selectionStart;

      const { viewMode } = this.state;
      let mainViewHtml = '';
      if (viewMode === 'kanban') mainViewHtml = this.renderBoardView();
      else if (viewMode === 'list') mainViewHtml = this.renderTaskListView();
      else if (viewMode === 'dashboard') mainViewHtml = this.renderDashboardView();
      else if (viewMode === 'analytics') mainViewHtml = this.renderAnalyticsView();

      const modalHtml =
        this.renderConfirmDialog() ||
        this.renderCardDetailModal() ||
        this.renderBoardModal() ||
        this.renderAddColumnModal() ||
        this.renderGlobalSearchModal() ||
        this.renderArchiveModal() ||
        this.renderBackupModal() ||
        this.renderShortcutsModal();

      appEl.innerHTML = `
        <div class="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
          ${this.renderSidebar()}
          <main class="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-50/50 dark:bg-slate-950">
            ${this.renderHeader()}
            <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
              ${mainViewHtml}
            </div>
          </main>
          ${modalHtml}
        </div>
      `;

      this.syncModalDialogElement();

      if (activeInputAttr) {
        const restored = document.querySelector(`[data-input="${activeInputAttr}"]`);
        if (restored) {
          restored.focus();
          if (typeof selStart === 'number') {
            try {
              restored.setSelectionRange(selStart, selStart);
            } catch {}
          }
        }
      }
    }

    // --- GLOBAL EVENT DELEGATION & DRAG AND DROP ---
    bindGlobalEvents() {
      const appEl = document.getElementById('app');

      // Click handler
      appEl.addEventListener('click', (e) => {
        const stopEl = e.target.closest('[data-stop-propagation="true"]');
        const actionEl = e.target.closest('[data-action]');
        if (!actionEl) return;
        if (stopEl && !stopEl.contains(actionEl)) return;

        const action = actionEl.getAttribute('data-action');
        const boardId = actionEl.getAttribute('data-board-id');
        const columnId = actionEl.getAttribute('data-column-id');
        const cardId = actionEl.getAttribute('data-card-id');

        switch (action) {
          case 'toggle-sidebar':
            this.state.isSidebarOpen = !this.state.isSidebarOpen;
            this.render();
            break;
          case 'close-sidebar-backdrop':
            this.state.isSidebarOpen = false;
            this.render();
            break;
          case 'set-view':
            this.state.viewMode = actionEl.getAttribute('data-view') || 'kanban';
            if (window.innerWidth < 1024) this.state.isSidebarOpen = false;
            this.render();
            break;
          case 'select-board':
            if (boardId) this.selectBoard(boardId);
            break;
          case 'select-board-open':
            if (boardId) {
              this.state.viewMode = 'kanban';
              this.selectBoard(boardId);
            }
            break;
          case 'toggle-theme':
            this.toggleTheme();
            break;
          case 'toggle-sound':
            this.updateSettings({ enableSound: !this.state.settings.enableSound });
            this.showToast('info', this.state.settings.enableSound ? 'Sons ativados' : 'Sons silenciados');
            break;
          case 'toggle-favorite-board':
            if (boardId) this.toggleFavoriteBoard(boardId);
            break;
          case 'toggle-board-menu':
            this.state.isBoardMenuOpen = !this.state.isBoardMenuOpen;
            this.state.isFilterMenuOpen = false;
            this.render();
            break;
          case 'toggle-filter-menu':
            this.state.isFilterMenuOpen = !this.state.isFilterMenuOpen;
            this.state.isBoardMenuOpen = false;
            this.render();
            break;
          case 'close-popovers':
            this.state.isBoardMenuOpen = false;
            this.state.isFilterMenuOpen = false;
            this.state.openColumnMenuId = null;
            this.state.openCardMenuId = null;
            this.render();
            break;
          case 'reset-filters':
            this.state.filters = { search: '', priorities: [], dueFilter: 'all', sortBy: 'order' };
            this.render();
            break;
          case 'toggle-filter-priority': {
            const p = actionEl.getAttribute('data-priority');
            const list = this.state.filters.priorities;
            this.state.filters.priorities = list.includes(p) ? list.filter((x) => x !== p) : [...list, p];
            this.render();
            break;
          }
          case 'open-create-board':
            this.state.boardModal = { isOpen: true, editingBoardId: null, color: 'indigo' };
            this.render();
            break;
          case 'open-edit-board': {
            const b = this.state.boards.find((x) => x.id === boardId);
            this.state.isBoardMenuOpen = false;
            this.state.boardModal = { isOpen: true, editingBoardId: boardId, color: b?.color || 'indigo' };
            this.render();
            break;
          }
          case 'pick-board-color':
            this.state.boardModal.color = actionEl.getAttribute('data-color') || 'indigo';
            this.render();
            break;
          case 'duplicate-board':
            this.state.isBoardMenuOpen = false;
            if (boardId) this.duplicateBoard(boardId);
            break;
          case 'archive-board':
            this.state.isBoardMenuOpen = false;
            if (boardId) this.archiveBoard(boardId);
            break;
          case 'restore-board':
            if (boardId) this.restoreBoard(boardId);
            break;
          case 'confirm-delete-board': {
            const b = this.state.boards.find((x) => x.id === boardId);
            this.state.isBoardMenuOpen = false;
            this.state.confirmDialog = {
              title: 'Excluir Quadro',
              message: `Tem certeza que deseja excluir o quadro "${b?.title || ''}" e todas as suas colunas e tarefas?`,
              confirmText: 'Sim, excluir quadro',
              isDestructive: true,
              onConfirm: () => this.deleteBoard(boardId),
            };
            this.render();
            break;
          }
          case 'open-add-column':
            this.state.columnModal = { isOpen: true, editingColumnId: null, color: '#6366f1' };
            this.render();
            break;
          case 'pick-column-color':
            this.state.columnModal.color = actionEl.getAttribute('data-color') || '#6366f1';
            this.render();
            break;
          case 'toggle-column-menu':
            this.state.openColumnMenuId = this.state.openColumnMenuId === columnId ? null : columnId;
            this.state.openCardMenuId = null;
            this.render();
            break;
          case 'start-rename-column':
            this.state.openColumnMenuId = null;
            this.state.editingColumnTitleId = columnId;
            this.render();
            break;
          case 'move-column':
            this.state.openColumnMenuId = null;
            this.moveColumnOrder(columnId, actionEl.getAttribute('data-dir'));
            break;
          case 'confirm-clear-column': {
            const col = this.state.columns.find((c) => c.id === columnId);
            this.state.openColumnMenuId = null;
            this.state.confirmDialog = {
              title: 'Limpar Tarefas da Etapa',
              message: `Deseja remover todas as tarefas da coluna "${col?.title || ''}"?`,
              confirmText: 'Limpar tarefas',
              isDestructive: true,
              onConfirm: () => this.clearColumnCards(columnId),
            };
            this.render();
            break;
          }
          case 'confirm-delete-column': {
            const col = this.state.columns.find((c) => c.id === columnId);
            this.state.openColumnMenuId = null;
            this.state.confirmDialog = {
              title: 'Excluir Coluna',
              message: `Deseja excluir a coluna "${col?.title || ''}" e todas as suas tarefas?`,
              confirmText: 'Sim, excluir coluna',
              isDestructive: true,
              onConfirm: () => this.deleteColumn(columnId),
            };
            this.render();
            break;
          }
          case 'open-quick-add':
            this.state.quickAddColumnId = columnId;
            this.render();
            break;
          case 'cancel-quick-add':
            this.state.quickAddColumnId = null;
            this.render();
            break;
          case 'quick-new-task-header': {
            const activeBoard = this.getActiveBoard();
            if (!activeBoard) break;
            const cols = this.getBoardColumns(activeBoard.id);
            const targetCol = cols.find((c) => c.title.toLowerCase().includes('fazer')) || cols[0];
            if (targetCol) {
              this.createCard({ columnId: targetCol.id, title: 'Nova Tarefa', openAfterCreate: true });
            }
            break;
          }
          case 'toggle-card-menu':
            e.stopPropagation();
            this.state.openCardMenuId = this.state.openCardMenuId === cardId ? null : cardId;
            this.state.openColumnMenuId = null;
            this.render();
            break;
          case 'open-card':
            this.state.openCardMenuId = null;
            this.state.selectedCardId = cardId;
            this.render();
            break;
          case 'open-card-from-search':
            if (boardId) this.state.settings.activeBoardId = boardId;
            this.state.isGlobalSearchOpen = false;
            this.state.selectedCardId = cardId;
            this.render();
            break;
          case 'duplicate-card':
            this.state.openCardMenuId = null;
            if (cardId) this.duplicateCard(cardId);
            break;
          case 'archive-card':
            this.state.openCardMenuId = null;
            if (cardId) this.archiveCard(cardId);
            break;
          case 'restore-card':
            if (cardId) this.restoreCard(cardId);
            break;
          case 'quick-move-card': {
            this.state.openCardMenuId = null;
            const destColId = actionEl.getAttribute('data-dest-col-id');
            if (cardId && destColId) this.moveCard(cardId, destColId);
            break;
          }
          case 'confirm-delete-card': {
            const c = this.state.cards.find((x) => x.id === cardId);
            this.state.openCardMenuId = null;
            this.state.confirmDialog = {
              title: 'Excluir Tarefa',
              message: `Tem certeza que deseja excluir permanentemente "${c?.title || ''}"?`,
              confirmText: 'Sim, excluir',
              isDestructive: true,
              onConfirm: () => this.deleteCard(cardId),
            };
            this.render();
            break;
          }
          case 'toggle-subtask-inline': {
            const subId = actionEl.getAttribute('data-subtask-id');
            if (cardId && subId) this.toggleSubtask(cardId, subId);
            break;
          }
          case 'delete-subtask': {
            const subId = actionEl.getAttribute('data-subtask-id');
            if (cardId && subId) this.deleteSubtask(cardId, subId);
            break;
          }
          case 'set-card-priority': {
            const p = actionEl.getAttribute('data-priority');
            if (cardId && p) this.updateCard(cardId, { priority: p }, `Prioridade alterada para ${PRIORITY_CONFIG[p]?.label || p}`);
            break;
          }
          case 'clear-card-duedate':
            if (cardId) this.updateCard(cardId, { dueDate: null }, 'Prazo de entrega removido');
            break;
          case 'toggle-card-label': {
            const lblId = actionEl.getAttribute('data-label-id');
            const card = this.state.cards.find((c) => c.id === cardId);
            if (card && lblId) {
              const cur = card.labels || [];
              const next = cur.includes(lblId) ? cur.filter((x) => x !== lblId) : [...cur, lblId];
              this.updateCard(cardId, { labels: next });
            }
            break;
          }
          case 'toggle-create-label':
            this.state.isCreatingLabel = !this.state.isCreatingLabel;
            this.render();
            break;
          case 'pick-label-color':
            this.state.newLabelColor = actionEl.getAttribute('data-color') || 'indigo';
            this.render();
            break;
          case 'toggle-add-link':
            this.state.isAddingLink = !this.state.isAddingLink;
            this.render();
            break;
          case 'delete-card-link': {
            const lnkId = actionEl.getAttribute('data-link-id');
            if (cardId && lnkId) this.deleteCardLink(cardId, lnkId);
            break;
          }
          case 'open-global-search':
            this.state.isGlobalSearchOpen = true;
            this.state.globalSearchQuery = '';
            this.render();
            break;
          case 'open-archive':
            this.state.isArchiveModalOpen = true;
            this.render();
            break;
          case 'set-archive-tab':
            this.state.archiveTab = actionEl.getAttribute('data-tab') || 'cards';
            this.render();
            break;
          case 'open-backup':
            this.state.isBackupModalOpen = true;
            this.state.importError = null;
            this.render();
            break;
          case 'export-json':
            this.exportBackupJson();
            break;
          case 'export-markdown':
            this.exportBoardMarkdown();
            break;
          case 'execute-import':
            this.executeImportBackup();
            break;
          case 'reset-demo-direct':
            this.resetDemoData();
            break;
          case 'confirm-reset-demo':
            this.state.confirmDialog = {
              title: 'Restaurar Dados Originais',
              message: 'Isso recarregará o quadro completo do TCC (102 tarefas) e o quadro demonstrativo de Ciclo de Vida de Projeto. Deseja continuar?',
              confirmText: 'Sim, restaurar padrão',
              isDestructive: false,
              onConfirm: () => this.resetDemoData(),
            };
            this.render();
            break;
          case 'confirm-clear-all':
            this.state.confirmDialog = {
              title: 'Limpar Todo o localStorage',
              message: 'Atenção: todos os quadros, colunas e tarefas salvos localmente no navegador serão apagados.',
              confirmText: 'Sim, apagar tudo',
              isDestructive: true,
              onConfirm: () => this.clearAllData(),
            };
            this.render();
            break;
          case 'open-shortcuts':
            this.state.isShortcutsModalOpen = true;
            this.render();
            break;
          case 'close-modal':
            this.closeAllModals();
            break;
          case 'close-confirm':
            this.state.confirmDialog = null;
            this.render();
            break;
          case 'execute-confirm':
            if (this.state.confirmDialog?.onConfirm) {
              const fn = this.state.confirmDialog.onConfirm;
              this.state.confirmDialog = null;
              fn();
            }
            break;
        }
      });

      // Form submissions
      appEl.addEventListener('submit', async (e) => {
        const form = e.target.closest('[data-form]');
        if (!form) return;
        e.preventDefault();
        const formType = form.getAttribute('data-form');
        const fd = new FormData(form);

        if (formType === 'quick-add-card') {
          const columnId = form.getAttribute('data-column-id');
          const title = (fd.get('title') || '').toString();
          const priority = (fd.get('priority') || 'medium').toString();
          if (title.trim() && columnId) {
            this.state.quickAddColumnId = null;
            await this.createCard({ columnId, title, priority });
          }
        } else if (formType === 'rename-column') {
          const columnId = form.getAttribute('data-column-id');
          const title = (fd.get('title') || '').toString();
          this.state.editingColumnTitleId = null;
          if (title.trim() && columnId) {
            await this.updateColumn(columnId, { title: title.trim() });
          } else {
            this.render();
          }
        } else if (formType === 'save-board') {
          const title = (fd.get('title') || '').toString();
          const description = (fd.get('description') || '').toString();
          const { editingBoardId, color } = this.state.boardModal;
          this.state.boardModal.isOpen = false;
          if (editingBoardId) {
            await this.updateBoard(editingBoardId, { title: title.trim(), description: description.trim(), color });
          } else {
            await this.createBoard({ title, description, color });
          }
        } else if (formType === 'save-column') {
          const title = (fd.get('title') || '').toString();
          const subtitle = (fd.get('subtitle') || '').toString();
          const cardLimit = (fd.get('cardLimit') || '').toString();
          const color = this.state.columnModal.color;
          this.state.columnModal.isOpen = false;
          await this.createColumn({ title, subtitle, color, cardLimit });
        } else if (formType === 'add-subtask') {
          const cardId = form.getAttribute('data-card-id');
          const text = (fd.get('subtaskText') || '').toString();
          if (cardId && text.trim()) {
            await this.addSubtask(cardId, text);
          }
        } else if (formType === 'create-label') {
          const cardId = form.getAttribute('data-card-id');
          const name = (fd.get('labelName') || '').toString();
          if (name.trim() && cardId) {
            const created = await this.createLabel(name, this.state.newLabelColor);
            const card = this.state.cards.find((c) => c.id === cardId);
            if (card) {
              this.state.isCreatingLabel = false;
              await this.updateCard(cardId, { labels: [...(card.labels || []), created.id] });
            }
          }
        } else if (formType === 'add-card-link') {
          const cardId = form.getAttribute('data-card-id');
          const title = (fd.get('linkTitle') || '').toString();
          const url = (fd.get('linkUrl') || '').toString();
          if (cardId && url.trim()) {
            this.state.isAddingLink = false;
            await this.addCardLink(cardId, title, url);
          }
        }
      });

      // Input & Change handlers
      appEl.addEventListener('input', (e) => {
        const inputType = e.target.getAttribute('data-input');
        if (inputType === 'filter-search') {
          this.state.filters.search = e.target.value;
          this.render();
        } else if (inputType === 'global-search') {
          this.state.globalSearchQuery = e.target.value;
          this.render();
        }
      });

      appEl.addEventListener('change', (e) => {
        const changeType = e.target.getAttribute('data-change');
        const cardId = e.target.getAttribute('data-card-id');
        if (changeType === 'filter-due') {
          this.state.filters.dueFilter = e.target.value;
          this.render();
        } else if (changeType === 'filter-sort') {
          this.state.filters.sortBy = e.target.value;
          this.render();
        } else if (changeType === 'toggle-compact') {
          this.updateSettings({ compactCards: e.target.checked });
        } else if (changeType === 'analytics-board') {
          this.state.analyticsBoardId = e.target.value;
          this.render();
        } else if (changeType === 'modal-card-column' && cardId) {
          this.moveCard(cardId, e.target.value);
        } else if (changeType === 'modal-card-duedate' && cardId) {
          this.updateCard(cardId, { dueDate: e.target.value || null }, `Prazo definido para ${e.target.value}`);
        } else if (changeType === 'set-import-mode') {
          this.state.importMode = e.target.value;
        } else if (changeType === 'import-backup-file') {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (ev) => {
            try {
              const parsed = JSON.parse(ev.target.result);
              if (!parsed || !Array.isArray(parsed.boards) || !Array.isArray(parsed.cards)) {
                throw new Error('Formato de arquivo JSON inválido.');
              }
              this.state.importedBackupData = parsed;
              this.state.importError = null;
              this.render();
            } catch (err) {
              this.state.importError = err.message || 'Erro ao ler JSON.';
              this.state.importedBackupData = null;
              this.render();
            }
          };
          reader.readAsText(file);
        }
      });

      // Blur auto-save for modal title/description/notes
      appEl.addEventListener(
        'blur',
        (e) => {
          const blurType = e.target.getAttribute?.('data-blur');
          const cardId = e.target.getAttribute?.('data-card-id');
          if (!blurType || !cardId) return;
          const card = this.state.cards.find((c) => c.id === cardId);
          if (!card) return;

          if (blurType === 'modal-card-title') {
            const val = e.target.value.trim();
            if (val && val !== card.title) {
              this.updateCard(cardId, { title: val }, `Título atualizado para "${val}"`);
            }
          } else if (blurType === 'modal-card-desc') {
            const val = e.target.value.trim();
            if (val !== (card.description || '')) {
              this.updateCard(cardId, { description: val }, 'Descrição atualizada');
            }
          } else if (blurType === 'modal-card-notes') {
            const val = e.target.value.trim();
            if (val !== (card.notes || '')) {
              this.updateCard(cardId, { notes: val }, 'Notas técnicas atualizadas');
            }
          }
        },
        true
      );

      // HTML5 Drag & Drop for Cards
      appEl.addEventListener('dragstart', (e) => {
        const cardEl = e.target.closest('.kanban-card');
        if (!cardEl) return;
        const cardId = cardEl.getAttribute('data-card-id');
        const colId = cardEl.getAttribute('data-column-id');
        this.state.draggedCardId = cardId;
        this.state.draggedSourceColId = colId;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', cardId);
        setTimeout(() => cardEl.classList.add('is-dragging'), 0);
      });

      appEl.addEventListener('dragend', (e) => {
        const cardEl = e.target.closest('.kanban-card');
        if (cardEl) cardEl.classList.remove('is-dragging');
        document.querySelectorAll('.drag-over, .drag-over-top, .drag-over-bottom').forEach((el) => {
          el.classList.remove('drag-over', 'drag-over-top', 'drag-over-bottom');
        });
        this.state.draggedCardId = null;
        this.state.draggedSourceColId = null;
      });

      appEl.addEventListener('dragover', (e) => {
        const dropCol = e.target.closest('[data-column-dropzone]');
        if (!dropCol || !this.state.draggedCardId) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        document.querySelectorAll('.kanban-column-dropzone.drag-over').forEach((el) => {
          if (el !== dropCol) el.classList.remove('drag-over');
        });
        dropCol.classList.add('drag-over');

        const overCard = e.target.closest('.kanban-card');
        document.querySelectorAll('.drag-over-top, .drag-over-bottom').forEach((el) => {
          if (el !== overCard) el.classList.remove('drag-over-top', 'drag-over-bottom');
        });

        if (overCard && overCard.getAttribute('data-card-id') !== this.state.draggedCardId) {
          const rect = overCard.getBoundingClientRect();
          const isAfter = e.clientY > rect.top + rect.height / 2;
          overCard.classList.toggle('drag-over-bottom', isAfter);
          overCard.classList.toggle('drag-over-top', !isAfter);
        }
      });

      appEl.addEventListener('drop', (e) => {
        const dropCol = e.target.closest('[data-column-dropzone]');
        if (!dropCol || !this.state.draggedCardId) return;
        e.preventDefault();

        const destColId = dropCol.getAttribute('data-column-dropzone');
        const overCard = e.target.closest('.kanban-card');
        let targetCardId = null;
        let insertAfter = false;

        if (overCard && overCard.getAttribute('data-card-id') !== this.state.draggedCardId) {
          targetCardId = overCard.getAttribute('data-card-id');
          const rect = overCard.getBoundingClientRect();
          insertAfter = e.clientY > rect.top + rect.height / 2;
        }

        const draggedId = this.state.draggedCardId;
        this.state.draggedCardId = null;
        this.moveCard(draggedId, destColId, targetCardId, insertAfter);
      });

      // Global Keyboard Shortcuts
      window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
          e.preventDefault();
          this.state.isGlobalSearchOpen = !this.state.isGlobalSearchOpen;
          this.render();
          return;
        }

        const tag = (e.target?.tagName || '').toUpperCase();
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable) {
          if (e.key === 'Escape') {
            e.target.blur();
          }
          return;
        }

        if (e.key === 'Escape') {
          this.closeAllModals();
          return;
        }

        if (e.key === 'n' || e.key === 'N') {
          e.preventDefault();
          const activeBoard = this.getActiveBoard();
          if (activeBoard) {
            const cols = this.getBoardColumns(activeBoard.id);
            const targetCol = cols.find((c) => c.title.toLowerCase().includes('fazer')) || cols[0];
            if (targetCol) {
              this.state.quickAddColumnId = targetCol.id;
              this.render();
            }
          }
        } else if (e.key === 'b' || e.key === 'B') {
          e.preventDefault();
          this.state.boardModal = { isOpen: true, editingBoardId: null, color: 'indigo' };
          this.render();
        } else if (e.key === 'd' || e.key === 'D') {
          e.preventDefault();
          this.toggleTheme();
        } else if (e.key === '?') {
          e.preventDefault();
          this.state.isShortcutsModalOpen = !this.state.isShortcutsModalOpen;
          this.render();
        } else if (e.key === '1') {
          this.state.viewMode = 'kanban';
          this.render();
        } else if (e.key === '2') {
          this.state.viewMode = 'list';
          this.render();
        } else if (e.key === '3') {
          this.state.viewMode = 'dashboard';
          this.render();
        } else if (e.key === '4') {
          this.state.viewMode = 'analytics';
          this.render();
        }
      });
    }
  }

  // Start the application when DOM is ready
  const app = new KanbanApp();
  global.kanbanApp = app;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.init());
  } else {
    app.init();
  }
})(typeof window !== 'undefined' ? window : globalThis);
