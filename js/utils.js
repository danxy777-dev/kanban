// ==========================================
// UTILITIES - Colors, Dates, Sound, Confetti, Icons
// 100% Client-Side Static Utilities
// ==========================================

(function (global) {
  const BOARD_COLORS = [
    { id: 'indigo', name: 'Índigo Real', bg: 'bg-indigo-500/10 dark:bg-indigo-500/20', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-500/30', accent: '#6366f1', gradient: 'from-indigo-600 to-blue-600' },
    { id: 'violet', name: 'Violeta Neon', bg: 'bg-purple-500/10 dark:bg-purple-500/20', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500/30', accent: '#a855f7', gradient: 'from-purple-600 to-pink-600' },
    { id: 'emerald', name: 'Esmeralda', bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/30', accent: '#10b981', gradient: 'from-emerald-600 to-teal-600' },
    { id: 'cyan', name: 'Ciano Oceano', bg: 'bg-cyan-500/10 dark:bg-cyan-500/20', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-500/30', accent: '#06b6d4', gradient: 'from-cyan-600 to-blue-500' },
    { id: 'amber', name: 'Âmbar Solar', bg: 'bg-amber-500/10 dark:bg-amber-500/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/30', accent: '#f59e0b', gradient: 'from-amber-500 to-orange-600' },
    { id: 'rose', name: 'Rosa Rubi', bg: 'bg-rose-500/10 dark:bg-rose-500/20', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/30', accent: '#f43f5e', gradient: 'from-rose-600 to-red-600' },
    { id: 'slate', name: 'Ardósia / Grafite', bg: 'bg-slate-500/10 dark:bg-slate-500/20', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-500/30', accent: '#64748b', gradient: 'from-slate-600 to-zinc-700' },
  ];

  const LABEL_COLORS = {
    emerald: { name: 'Esmeralda', bg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-500', hex: '#10b981' },
    indigo: { name: 'Índigo', bg: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-500/30', dot: 'bg-indigo-500', hex: '#6366f1' },
    purple: { name: 'Roxo', bg: 'bg-purple-500/15 text-purple-700 dark:text-purple-300', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500/30', dot: 'bg-purple-500', hex: '#a855f7' },
    cyan: { name: 'Ciano', bg: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-500/30', dot: 'bg-cyan-500', hex: '#06b6d4' },
    amber: { name: 'Âmbar', bg: 'bg-amber-500/15 text-amber-800 dark:text-amber-300', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/30', dot: 'bg-amber-500', hex: '#f59e0b' },
    rose: { name: 'Rosa', bg: 'bg-rose-500/15 text-rose-700 dark:text-rose-300', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/30', dot: 'bg-rose-500', hex: '#f43f5e' },
    blue: { name: 'Azul', bg: 'bg-blue-500/15 text-blue-700 dark:text-blue-300', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/30', dot: 'bg-blue-500', hex: '#3b82f6' },
    slate: { name: 'Cinza', bg: 'bg-slate-500/15 text-slate-700 dark:text-slate-300', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-500/30', dot: 'bg-slate-500', hex: '#64748b' },
  };

  const PRIORITY_CONFIG = {
    low: {
      label: 'Baixa',
      bg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
      text: 'text-slate-500 dark:text-slate-400',
      border: 'border-slate-500/20',
      badgeBg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
      dotColor: '#64748b',
      level: 1,
    },
    medium: {
      label: 'Média',
      bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-500/20',
      badgeBg: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
      dotColor: '#3b82f6',
      level: 2,
    },
    high: {
      label: 'Alta',
      bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-500/20',
      badgeBg: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
      dotColor: '#f59e0b',
      level: 3,
    },
    urgent: {
      label: 'Urgente',
      bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
      text: 'text-rose-600 dark:text-rose-400',
      border: 'border-rose-500/30',
      badgeBg: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
      dotColor: '#f43f5e',
      level: 4,
    },
  };

  const COLUMN_COLORS = [
    '#64748b', '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f43f5e',
  ];

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatDueDate(dateString) {
    if (!dateString) return '';
    try {
      const date = new Date(dateString + 'T00:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      if (date.getTime() === today.getTime()) return 'Hoje';
      if (date.getTime() === tomorrow.getTime()) return 'Amanhã';
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    } catch {
      return dateString;
    }
  }

  function formatFullDate(dateString) {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  }

  function formatDateShort(dateString) {
    if (!dateString) return '';
    try {
      const date = new Date(dateString + 'T00:00:00');
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateString;
    }
  }

  function getDueStatus(dateString, isDoneColumn = false) {
    if (!dateString) return null;
    try {
      const date = new Date(dateString + 'T00:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(date);
      target.setHours(0, 0, 0, 0);
      const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));

      if (isDoneColumn) {
        return {
          isOverdue: false,
          isToday: false,
          isSoon: false,
          relativeText: date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
          badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
        };
      }

      if (target < today) {
        const daysOverdue = Math.abs(diff);
        return {
          isOverdue: true,
          isToday: false,
          isSoon: false,
          relativeText: daysOverdue === 1 ? 'Atrasado (ontem)' : `Atrasado há ${daysOverdue}d`,
          badgeClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30',
        };
      }
      if (diff === 0) {
        return {
          isOverdue: false,
          isToday: true,
          isSoon: true,
          relativeText: 'Vence hoje',
          badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30',
        };
      }
      if (diff === 1) {
        return {
          isOverdue: false,
          isToday: false,
          isSoon: true,
          relativeText: 'Vence amanhã',
          badgeClass: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30',
        };
      }
      if (diff <= 3) {
        return {
          isOverdue: false,
          isToday: false,
          isSoon: true,
          relativeText: `Vence em ${diff} dias`,
          badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
        };
      }
      return {
        isOverdue: false,
        isToday: false,
        isSoon: false,
        relativeText: date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        badgeClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20',
      };
    } catch {
      return null;
    }
  }

  function generateId(prefix = 'id') {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
  }

  // Web Audio API Synthesizer (100% offline, no external audio files needed)
  class SoundManager {
    constructor() {
      this.ctx = null;
      this.enabled = true;
    }
    getContext() {
      if (typeof window === 'undefined') return null;
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    }
    setEnabled(enabled) {
      this.enabled = !!enabled;
    }
    isEnabled() {
      return this.enabled;
    }
    playCardMove() {
      if (!this.enabled) return;
      try {
        const ctx = this.getContext();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } catch {}
    }
    playCardCreate() {
      if (!this.enabled) return;
      try {
        const ctx = this.getContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(660, now + 0.12);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(now + 0.12);
      } catch {}
    }
    playTaskComplete() {
      if (!this.enabled) return;
      try {
        const ctx = this.getContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.06);
          gain.gain.setValueAtTime(0.12, now + idx * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.2);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.06);
          osc.stop(now + idx * 0.06 + 0.22);
        });
      } catch {}
    }
    playDelete() {
      if (!this.enabled) return;
      try {
        const ctx = this.getContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(now + 0.15);
      } catch {}
    }
  }

  const soundManager = new SoundManager();

  // Standalone Canvas Confetti (100% Offline, Zero Dependencies)
  function triggerConfetti(originX = 0.5, originY = 0.5) {
    if (typeof document === 'undefined') return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.style.position = 'fixed';
      canvas.style.inset = '0';
      canvas.style.width = '100vw';
      canvas.style.height = '100vh';
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = '99999';
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      document.body.appendChild(canvas);

      const ctx = canvas.getContext('2d');
      const colors = ['#6366f1', '#a855f7', '#10b981', '#06b6d4', '#f59e0b', '#f43f5e'];
      const particles = [];
      const startX = canvas.width * originX;
      const startY = canvas.height * originY;

      for (let i = 0; i < 65; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 4 + Math.random() * 9;
        particles.push({
          x: startX,
          y: startY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 4,
          size: 5 + Math.random() * 5,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * 360,
          vRot: (Math.random() - 0.5) * 12,
          alpha: 1,
        });
      }

      let frame = 0;
      function animate() {
        frame++;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let alive = false;
        for (const p of particles) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.28; // gravity
          p.vx *= 0.985;
          p.rotation += p.vRot;
          if (frame > 40) p.alpha -= 0.025;
          if (p.alpha > 0) {
            alive = true;
            ctx.save();
            ctx.globalAlpha = Math.max(0, p.alpha);
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rotation * Math.PI) / 180);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.65);
            ctx.restore();
          }
        }
        if (alive && frame < 110) {
          requestAnimationFrame(animate);
        } else {
          canvas.remove();
        }
      }
      requestAnimationFrame(animate);
    } catch {}
  }

  // Embedded SVG Icon dictionary (Lucide Icons)
  const ICON_PATHS = {
    Kanban: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M8 7v7"/><path d="M12 7v4"/><path d="M16 7v9"/>',
    Cpu: '<rect width="16" height="16" x="4" y="4" rx="2"/><rect width="6" height="6" x="9" y="9" rx="1"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/>',
    LayoutDashboard: '<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
    ListTodo: '<rect x="3" y="5" width="6" height="6" rx="1"/><path d="m3 17 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/>',
    BarChart3: '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
    Archive: '<rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>',
    Plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    Star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    Moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    Sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
    Volume2: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>',
    VolumeX: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="22" x2="16" y1="9" y2="15"/><line x1="16" x2="22" y1="9" y2="15"/>',
    HardDrive: '<line x1="22" x2="2" y1="12" y2="12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/><line x1="6" x2="6.01" y1="16" y2="16"/><line x1="10" x2="10.01" y1="16" y2="16"/>',
    Keyboard: '<path d="M10 8h.01"/><path d="M12 12h.01"/><path d="M14 8h.01"/><path d="M16 12h.01"/><path d="M18 8h.01"/><path d="M6 8h.01"/><path d="M7 16h10"/><path d="M8 12h.01"/><rect width="20" height="16" x="2" y="4" rx="2"/>',
    X: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    Sparkles: '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>',
    Menu: '<line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>',
    Search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    MoreVertical: '<circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>',
    Edit2: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
    Copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    Trash2: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>',
    Trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
    SlidersHorizontal: '<line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/>',
    Columns: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M12 3v18"/>',
    Eraser: '<path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/>',
    AlertCircle: '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',
    Check: '<path d="M20 6 9 17l-5-5"/>',
    Calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
    CheckSquare: '<path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
    Link2: '<path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 1 1 0 10h-2"/><line x1="8" x2="16" y1="12" y2="12"/>',
    FileText: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
    ExternalLink: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    Clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    Tag: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>',
    History: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
    ChevronDown: '<path d="m6 9 6 6 6-6"/>',
    ChevronLeft: '<path d="m15 18-6-6 6-6"/>',
    ChevronRight: '<path d="m9 18 6-6-6-6"/>',
    CheckCircle2: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    AlertTriangle: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    Flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    LayoutGrid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
    ArrowRight: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    TrendingUp: '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
    PieChart: '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
    Award: '<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>',
    ListOrdered: '<line x1="10" x2="21" y1="6" y2="6"/><line x1="10" x2="21" y1="12" y2="12"/><line x1="10" x2="21" y1="18" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>',
    Download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
    RotateCcw: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    Database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>',
    FileCheck: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m9 15 2 2 4-4"/>',
    GripVertical: '<circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/>',
  };

  function icon(name, className = 'w-4 h-4') {
    const body = ICON_PATHS[name] || ICON_PATHS.Kanban;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-block shrink-0 ${className}" aria-hidden="true">${body}</svg>`;
  }

  global.KanbanUtils = {
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
  };
})(typeof window !== 'undefined' ? window : globalThis);
