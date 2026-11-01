// ==========================================
// DATABASE SERVICE - 100% Client-Side localStorage
// Com fallback em memória e seed inicial automático
// ==========================================

(function (global) {
  const STORAGE_KEYS = {
    SCHEMA_VERSION: 'kanbanflow_schema_version',
    BOARDS: 'kanbanflow_boards',
    COLUMNS: 'kanbanflow_columns',
    CARDS: 'kanbanflow_cards',
    LABELS: 'kanbanflow_labels',
    ACTIVITIES: 'kanbanflow_activities',
    SETTINGS: 'kanbanflow_settings',
  };

  const CURRENT_SCHEMA_VERSION = '2.0';

  class LocalStorageDatabaseService {
    constructor() {
      this.memoryFallback = {};
      this.useMemory = !this._isLocalStorageAvailable();
    }

    _isLocalStorageAvailable() {
      try {
        if (typeof window === 'undefined' || !window.localStorage) return false;
        const testKey = '__kanban_ls_test__';
        window.localStorage.setItem(testKey, '1');
        window.localStorage.removeItem(testKey);
        return true;
      } catch {
        return false;
      }
    }

    _readRaw(key, defaultVal) {
      try {
        if (this.useMemory) {
          return this.memoryFallback[key] !== undefined
            ? JSON.parse(JSON.stringify(this.memoryFallback[key]))
            : defaultVal;
        }
        const raw = window.localStorage.getItem(key);
        if (!raw) return defaultVal;
        return JSON.parse(raw);
      } catch {
        return defaultVal;
      }
    }

    _writeRaw(key, value) {
      try {
        if (this.useMemory) {
          this.memoryFallback[key] = JSON.parse(JSON.stringify(value));
          return;
        }
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch (err) {
        console.warn('Fallback para memória local acionado:', err);
        this.useMemory = true;
        this.memoryFallback[key] = JSON.parse(JSON.stringify(value));
      }
    }

    _upsertById(list, item) {
      const idx = list.findIndex((x) => x.id === item.id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...item };
      } else {
        list.push(item);
      }
      return list;
    }

    _seedDefaultData(initialData) {
      const boards = [
        JSON.parse(JSON.stringify(initialData.TCC_BOARD)),
        JSON.parse(JSON.stringify(initialData.INITIAL_BOARD)),
      ];
      const columns = [
        ...JSON.parse(JSON.stringify(initialData.TCC_COLUMNS)),
        ...JSON.parse(JSON.stringify(initialData.INITIAL_COLUMNS)),
      ];
      const cards = [
        ...JSON.parse(JSON.stringify(initialData.TCC_CARDS)),
        ...JSON.parse(JSON.stringify(initialData.INITIAL_CARDS)),
      ];

      const labelMap = new Map();
      for (const lbl of [...initialData.TCC_LABELS, ...initialData.INITIAL_LABELS]) {
        labelMap.set(lbl.id, { ...lbl });
      }
      const labels = Array.from(labelMap.values());

      const settings = {
        ...initialData.INITIAL_SETTINGS,
        activeBoardId: initialData.TCC_BOARD.id,
      };

      const activities = [
        {
          id: 'act-init-1',
          cardId: 'card-tcc-a1',
          type: 'system',
          details: 'Quadro inicializado localmente via localStorage (100% Client-Side)',
          timestamp: new Date().toISOString(),
        },
      ];

      this._writeRaw(STORAGE_KEYS.BOARDS, boards);
      this._writeRaw(STORAGE_KEYS.COLUMNS, columns);
      this._writeRaw(STORAGE_KEYS.CARDS, cards);
      this._writeRaw(STORAGE_KEYS.LABELS, labels);
      this._writeRaw(STORAGE_KEYS.ACTIVITIES, activities);
      this._writeRaw(STORAGE_KEYS.SETTINGS, settings);
      this._writeRaw(STORAGE_KEYS.SCHEMA_VERSION, CURRENT_SCHEMA_VERSION);

      return { boards, columns, cards, labels, activities, settings };
    }

    async initialize(initialData = global.KanbanInitialData) {
      const version = this._readRaw(STORAGE_KEYS.SCHEMA_VERSION, null);
      let boards = this._readRaw(STORAGE_KEYS.BOARDS, []);
      let columns = this._readRaw(STORAGE_KEYS.COLUMNS, []);
      let cards = this._readRaw(STORAGE_KEYS.CARDS, []);
      let labels = this._readRaw(STORAGE_KEYS.LABELS, []);
      let activities = this._readRaw(STORAGE_KEYS.ACTIVITIES, []);
      let settings = this._readRaw(STORAGE_KEYS.SETTINGS, null);

      const hasTCC = Array.isArray(boards) && boards.some((b) => b.id === initialData.TCC_BOARD.id);
      const tccCardsCount = Array.isArray(cards)
        ? cards.filter((c) => c.boardId === initialData.TCC_BOARD.id).length
        : 0;

      if (!Array.isArray(boards) || boards.length === 0 || (!hasTCC && version !== CURRENT_SCHEMA_VERSION) || (hasTCC && tccCardsCount < 20 && version !== CURRENT_SCHEMA_VERSION)) {
        const seeded = this._seedDefaultData(initialData);
        boards = seeded.boards;
        columns = seeded.columns;
        cards = seeded.cards;
        labels = seeded.labels;
        activities = seeded.activities;
        settings = seeded.settings;
      } else if (!settings) {
        settings = {
          ...initialData.INITIAL_SETTINGS,
          activeBoardId: boards[0]?.id || initialData.TCC_BOARD.id,
        };
        this._writeRaw(STORAGE_KEYS.SETTINGS, settings);
      }

      return {
        boards: boards.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
        columns: columns.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
        cards: cards.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
        labels,
        activities: activities.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || '')),
        settings,
      };
    }

    // Boards
    async getBoards() {
      const boards = this._readRaw(STORAGE_KEYS.BOARDS, []);
      return boards.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }

    async saveBoard(board) {
      const boards = this._readRaw(STORAGE_KEYS.BOARDS, []);
      this._upsertById(boards, board);
      this._writeRaw(STORAGE_KEYS.BOARDS, boards);
    }

    async saveBoards(boardsList) {
      const boards = this._readRaw(STORAGE_KEYS.BOARDS, []);
      for (const b of boardsList) this._upsertById(boards, b);
      this._writeRaw(STORAGE_KEYS.BOARDS, boards);
    }

    async deleteBoard(boardId) {
      const boards = this._readRaw(STORAGE_KEYS.BOARDS, []).filter((b) => b.id !== boardId);
      const columns = this._readRaw(STORAGE_KEYS.COLUMNS, []).filter((c) => c.boardId !== boardId);
      const removedCardIds = new Set(
        this._readRaw(STORAGE_KEYS.CARDS, [])
          .filter((c) => c.boardId === boardId)
          .map((c) => c.id)
      );
      const cards = this._readRaw(STORAGE_KEYS.CARDS, []).filter((c) => c.boardId !== boardId);
      const activities = this._readRaw(STORAGE_KEYS.ACTIVITIES, []).filter((a) => !removedCardIds.has(a.cardId));

      this._writeRaw(STORAGE_KEYS.BOARDS, boards);
      this._writeRaw(STORAGE_KEYS.COLUMNS, columns);
      this._writeRaw(STORAGE_KEYS.CARDS, cards);
      this._writeRaw(STORAGE_KEYS.ACTIVITIES, activities);
    }

    // Columns
    async saveColumn(column) {
      const columns = this._readRaw(STORAGE_KEYS.COLUMNS, []);
      this._upsertById(columns, column);
      this._writeRaw(STORAGE_KEYS.COLUMNS, columns);
    }

    async saveColumns(columnsList) {
      const columns = this._readRaw(STORAGE_KEYS.COLUMNS, []);
      for (const col of columnsList) this._upsertById(columns, col);
      this._writeRaw(STORAGE_KEYS.COLUMNS, columns);
    }

    async deleteColumn(columnId) {
      const columns = this._readRaw(STORAGE_KEYS.COLUMNS, []).filter((c) => c.id !== columnId);
      const cards = this._readRaw(STORAGE_KEYS.CARDS, []).filter((c) => c.columnId !== columnId);
      this._writeRaw(STORAGE_KEYS.COLUMNS, columns);
      this._writeRaw(STORAGE_KEYS.CARDS, cards);
    }

    // Cards
    async saveCard(card) {
      const cards = this._readRaw(STORAGE_KEYS.CARDS, []);
      this._upsertById(cards, card);
      this._writeRaw(STORAGE_KEYS.CARDS, cards);
    }

    async saveCards(cardsList) {
      const cards = this._readRaw(STORAGE_KEYS.CARDS, []);
      for (const c of cardsList) this._upsertById(cards, c);
      this._writeRaw(STORAGE_KEYS.CARDS, cards);
    }

    async deleteCard(cardId) {
      const cards = this._readRaw(STORAGE_KEYS.CARDS, []).filter((c) => c.id !== cardId);
      const activities = this._readRaw(STORAGE_KEYS.ACTIVITIES, []).filter((a) => a.cardId !== cardId);
      this._writeRaw(STORAGE_KEYS.CARDS, cards);
      this._writeRaw(STORAGE_KEYS.ACTIVITIES, activities);
    }

    // Labels
    async saveLabel(label) {
      const labels = this._readRaw(STORAGE_KEYS.LABELS, []);
      this._upsertById(labels, label);
      this._writeRaw(STORAGE_KEYS.LABELS, labels);
    }

    async deleteLabel(labelId) {
      const labels = this._readRaw(STORAGE_KEYS.LABELS, []).filter((l) => l.id !== labelId);
      this._writeRaw(STORAGE_KEYS.LABELS, labels);
    }

    // Activities
    async addActivity(activity) {
      const activities = this._readRaw(STORAGE_KEYS.ACTIVITIES, []);
      activities.unshift(activity);
      // Keep most recent 500 activities to optimize localStorage space
      if (activities.length > 500) activities.length = 500;
      this._writeRaw(STORAGE_KEYS.ACTIVITIES, activities);
    }

    async getActivities(cardId) {
      const activities = this._readRaw(STORAGE_KEYS.ACTIVITIES, []);
      if (cardId) {
        return activities
          .filter((a) => a.cardId === cardId)
          .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
      }
      return activities.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
    }

    // Settings
    async saveSettings(settings) {
      const current = this._readRaw(STORAGE_KEYS.SETTINGS, {});
      const updated = { ...current, ...settings };
      this._writeRaw(STORAGE_KEYS.SETTINGS, updated);
      return updated;
    }

    // Backup & Export
    async exportAllData() {
      const boards = this._readRaw(STORAGE_KEYS.BOARDS, []);
      const columns = this._readRaw(STORAGE_KEYS.COLUMNS, []);
      const cards = this._readRaw(STORAGE_KEYS.CARDS, []);
      const labels = this._readRaw(STORAGE_KEYS.LABELS, []);
      const activities = this._readRaw(STORAGE_KEYS.ACTIVITIES, []);
      const settings = this._readRaw(STORAGE_KEYS.SETTINGS, {});

      return {
        version: 2,
        storageEngine: 'localStorage',
        exportedAt: new Date().toISOString(),
        boards,
        columns,
        cards,
        labels,
        activities,
        settings,
      };
    }

    async importData(backup, mode = 'replace') {
      if (!backup || !Array.isArray(backup.boards) || !Array.isArray(backup.columns) || !Array.isArray(backup.cards)) {
        throw new Error('Arquivo de backup inválido ou com estrutura incompatível.');
      }

      if (mode === 'replace') {
        this._writeRaw(STORAGE_KEYS.BOARDS, backup.boards);
        this._writeRaw(STORAGE_KEYS.COLUMNS, backup.columns);
        this._writeRaw(STORAGE_KEYS.CARDS, backup.cards);
        if (Array.isArray(backup.labels)) this._writeRaw(STORAGE_KEYS.LABELS, backup.labels);
        if (Array.isArray(backup.activities)) this._writeRaw(STORAGE_KEYS.ACTIVITIES, backup.activities);
        if (backup.settings) this._writeRaw(STORAGE_KEYS.SETTINGS, backup.settings);
      } else {
        const boards = this._readRaw(STORAGE_KEYS.BOARDS, []);
        const columns = this._readRaw(STORAGE_KEYS.COLUMNS, []);
        const cards = this._readRaw(STORAGE_KEYS.CARDS, []);
        const labels = this._readRaw(STORAGE_KEYS.LABELS, []);

        for (const b of backup.boards) this._upsertById(boards, b);
        for (const c of backup.columns) this._upsertById(columns, c);
        for (const card of backup.cards) this._upsertById(cards, card);
        if (Array.isArray(backup.labels)) {
          for (const l of backup.labels) this._upsertById(labels, l);
        }

        this._writeRaw(STORAGE_KEYS.BOARDS, boards);
        this._writeRaw(STORAGE_KEYS.COLUMNS, columns);
        this._writeRaw(STORAGE_KEYS.CARDS, cards);
        this._writeRaw(STORAGE_KEYS.LABELS, labels);
      }
      this._writeRaw(STORAGE_KEYS.SCHEMA_VERSION, CURRENT_SCHEMA_VERSION);
    }

    async resetToDemo(initialData = global.KanbanInitialData) {
      return this._seedDefaultData(initialData);
    }

    async clearAll() {
      this._writeRaw(STORAGE_KEYS.BOARDS, []);
      this._writeRaw(STORAGE_KEYS.COLUMNS, []);
      this._writeRaw(STORAGE_KEYS.CARDS, []);
      this._writeRaw(STORAGE_KEYS.ACTIVITIES, []);
      this._writeRaw(STORAGE_KEYS.SCHEMA_VERSION, CURRENT_SCHEMA_VERSION);
    }

    getStorageStats() {
      try {
        let totalBytes = 0;
        for (const k of Object.values(STORAGE_KEYS)) {
          const val = this.useMemory
            ? JSON.stringify(this.memoryFallback[k] || '')
            : window.localStorage.getItem(k) || '';
          totalBytes += val.length * 2;
        }
        return {
          engine: this.useMemory ? 'Memória (Fallback)' : 'localStorage',
          kilobytes: (totalBytes / 1024).toFixed(1),
        };
      } catch {
        return { engine: 'localStorage', kilobytes: '0.0' };
      }
    }
  }

  global.KanbanDB = new LocalStorageDatabaseService();
})(typeof window !== 'undefined' ? window : globalThis);
