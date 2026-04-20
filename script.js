'use strict';

// ═══════════════════════════════════════════════════════════
//  CONSTANTS & CONFIG
// ═══════════════════════════════════════════════════════════

const DIFFICULTY = {
  easy:   { size: 64,  spawnDelay: 1200, lifetime: 4000,  label: 'FÁCIL',  missTimePenalty: 0   },
  medium: { size: 44,  spawnDelay: 900,  lifetime: 2500,  label: 'MÉDIO',  missTimePenalty: 2   },
  hard:   { size: 28,  spawnDelay: 600,  lifetime: 1500,  label: 'DIFÍCIL',missTimePenalty: 4   },
};

const GAME_MODE = {
  classic:   { label: 'CLÁSSICO',     duration: 60,  maxShots: Infinity, speedMode: false },
  survival:  { label: 'SOBREVIVÊNCIA',duration: 20,  maxShots: Infinity, speedMode: false },
  precision: { label: 'PRECISÃO',     duration: Infinity, maxShots: 30,  speedMode: false },
  speed:     { label: 'VELOCIDADE',   duration: 45,  maxShots: Infinity, speedMode: true  },
};

const COMBO_THRESHOLDS = [
  { min: 5,  bonus: 50,  label: '×1.5' },
  { min: 10, bonus: 100, label: '×2'   },
  { min: 20, bonus: 200, label: '×3'   },
];

const STORAGE_KEY = 'aimforge_data';

// ═══════════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════════

let state = {
  // Config
  mode: 'classic',
  difficulty: 'medium',

  // Runtime
  score: 0,
  hits: 0,
  misses: 0,
  combo: 0,
  maxCombo: 0,
  shots: 0,   // used in precision mode
  timeLeft: 60,
  running: false,
  paused: false,

  // Target
  targetVisible: false,
  targetSpawnTime: 0,
  targetX: 0,
  targetY: 0,
  spawnTimeout: null,
  lifetimeTimeout: null,

  // Reaction tracking
  reactionTimes: [],   // ms per hit

  // FPS
  fps: 60,
  lastFrameTime: 0,
  frameCount: 0,
  fpsTimer: 0,

  // Intervals
  gameInterval: null,
  fpsInterval: null,
};

// ═══════════════════════════════════════════════════════════
//  DOM REFS
// ═══════════════════════════════════════════════════════════

const $ = id => document.getElementById(id);

const DOM = {
  screens:    { menu: $('screen-menu'), game: $('screen-game'), result: $('screen-result') },
  // Menu
  modeBtns:   document.querySelectorAll('.mode-btn'),
  diffBtns:   document.querySelectorAll('.diff-btn'),
  btnStart:   $('btn-start'),
  bestScore:  $('best-score-display'),
  bestReact:  $('best-reaction-display'),
  bestAcc:    $('best-accuracy-display'),
  // HUD
  hudScore:   $('hud-score'),
  hudTimer:   $('hud-timer'),
  hudTimerLbl:$('hud-timer-lbl'),
  hudAcc:     $('hud-accuracy'),
  hudHits:    $('hud-hits'),
  hudMisses:  $('hud-misses'),
  hudCombo:   $('hud-combo'),
  hudReaction:$('hud-reaction'),
  hudFps:     $('hud-fps'),
  // Game
  gameArea:   $('game-area'),
  target:     $('target'),
  reactionInd:$('reaction-indicator'),
  btnPause:   $('btn-pause'),
  pauseOverlay:$('pause-overlay'),
  btnResume:  $('btn-resume'),
  btnQuit:    $('btn-quit'),
  // Result
  resultModetag: $('result-mode-tag'),
  resultScore:   $('result-score'),
  resultNewRec:  $('result-new-record'),
  resHits:    $('res-hits'),
  resMisses:  $('res-misses'),
  resAccuracy:$('res-accuracy'),
  resAvgReact:$('res-avg-reaction'),
  resBestReact:$('res-best-reaction'),
  resMaxCombo:$('res-max-combo'),
  reactionChart: $('reaction-chart'),
  rankingList:$('ranking-list'),
  btnRetry:   $('btn-retry'),
  btnMenu:    $('btn-menu'),
};

// ═══════════════════════════════════════════════════════════
//  LOCAL STORAGE
// ═══════════════════════════════════════════════════════════

function loadStorage() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { bestScore: 0, bestReaction: null, bestAccuracy: 0, rankings: [] };
  } catch { return { bestScore: 0, bestReaction: null, bestAccuracy: 0, rankings: [] }; }
}

function saveStorage(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

function updateMenuBests() {
  const data = loadStorage();
  DOM.bestScore.textContent  = data.bestScore > 0 ? data.bestScore : '—';
  DOM.bestReact.textContent  = data.bestReaction ? data.bestReaction + 'ms' : '—';
  DOM.bestAcc.textContent    = data.bestAccuracy > 0 ? data.bestAccuracy + '%' : '—';
}

// ═══════════════════════════════════════════════════════════
//  SCREEN MANAGEMENT
// ═══════════════════════════════════════════════════════════

function showScreen(name) {
  Object.values(DOM.screens).forEach(s => s.classList.remove('active'));
  DOM.screens[name].classList.add('active');
}

// ═══════════════════════════════════════════════════════════
//  AUDIO (Web Audio API)
// ═══════════════════════════════════════════════════════════

let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(freq, type, duration, vol = 0.3) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = type; osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + duration);
  } catch {}
}

const SFX = {
  hit()    { playTone(880, 'sine', .08, .25); setTimeout(() => playTone(1200, 'sine', .06, .15), 40); },
  miss()   { playTone(180, 'sawtooth', .18, .2); },
  combo()  { playTone(660, 'sine', .05, .2); setTimeout(() => playTone(990, 'sine', .05, .2), 60); setTimeout(() => playTone(1320, 'sine', .08, .2), 120); },
  start()  { [440,550,660,880].forEach((f,i) => setTimeout(() => playTone(f, 'sine', .12, .2), i * 80)); },
  end()    { [440,330,220].forEach((f,i) => setTimeout(() => playTone(f, 'triangle', .2, .25), i * 100)); },
  timeout(){ playTone(220, 'square', .12, .15); },
};

// ═══════════════════════════════════════════════════════════
//  RIPPLE EFFECTS
// ═══════════════════════════════════════════════════════════

function spawnRipple(x, y, type) {
  const el = document.createElement('div');
  el.className = `ripple ${type}`;
  el.style.left = x + 'px';
  el.style.top  = y + 'px';
  document.body.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}

// ═══════════════════════════════════════════════════════════
//  TARGET MANAGEMENT
// ═══════════════════════════════════════════════════════════

function getTargetSize() {
  const cfg = DIFFICULTY[state.difficulty];
  // Slightly scale down on small screens
  const scale = Math.min(1, DOM.gameArea.offsetWidth / 800);
  return Math.round(cfg.size * scale);
}

function spawnTarget() {
  if (!state.running || state.paused) return;

  const area = DOM.gameArea;
  const size = getTargetSize();
  const pad  = size / 2 + 8;

  // Random position inside game area
  const x = pad + Math.random() * (area.offsetWidth  - pad * 2);
  const y = pad + Math.random() * (area.offsetHeight - pad * 2);

  state.targetX = x;
  state.targetY = y;
  state.targetSpawnTime = performance.now();
  state.targetVisible = true;

  const t = DOM.target;
  t.className = `target target-${state.difficulty}`;
  t.style.width  = size + 'px';
  t.style.height = size + 'px';
  t.style.left   = x + 'px';
  t.style.top    = y + 'px';

  // Force reflow then show
  void t.offsetWidth;
  t.classList.add('visible');

  // Speed mode: shrinking animation + auto-miss
  if (GAME_MODE[state.mode].speedMode) {
    const lifetime = DIFFICULTY[state.difficulty].lifetime;
    t.style.setProperty('--shrink-duration', lifetime + 'ms');
    t.classList.add('shrinking');
  }

  // Auto-miss if not clicked in time
  const lifetime = DIFFICULTY[state.difficulty].lifetime;
  clearTimeout(state.lifetimeTimeout);
  state.lifetimeTimeout = setTimeout(() => {
    if (state.targetVisible) targetMissed(true);
  }, lifetime);
}

function hideTarget() {
  clearTimeout(state.lifetimeTimeout);
  state.targetVisible = false;
  const t = DOM.target;
  t.classList.remove('visible', 'shrinking');
  t.classList.add('hidden');
}

function scheduleNextTarget() {
  clearTimeout(state.spawnTimeout);
  const delay = DIFFICULTY[state.difficulty].spawnDelay;
  state.spawnTimeout = setTimeout(spawnTarget, delay);
}

// ═══════════════════════════════════════════════════════════
//  HIT / MISS
// ═══════════════════════════════════════════════════════════

function targetHit(clientX, clientY) {
  if (!state.targetVisible) return;

  const reactionMs = Math.round(performance.now() - state.targetSpawnTime);
  state.reactionTimes.push(reactionMs);

  hideTarget();
  state.hits++;
  state.combo++;
  if (state.combo > state.maxCombo) state.maxCombo = state.combo;

  // Combo bonus
  let bonus = 10;
  for (const tier of COMBO_THRESHOLDS) {
    if (state.combo >= tier.min) bonus = tier.bonus / 5; // scaled
  }
  // Base points: faster = more
  const speedBonus = Math.max(0, Math.round((2000 - reactionMs) / 100));
  const points = 10 + speedBonus + (state.combo > 4 ? state.combo * 2 : 0);
  state.score += points;

  // Survival mode: time bonus
  if (state.mode === 'survival') {
    state.timeLeft = Math.min(state.timeLeft + 3, GAME_MODE.survival.duration + 20);
  }

  SFX.hit();
  if (state.combo % 5 === 0 && state.combo > 0) SFX.combo();

  spawnRipple(clientX, clientY, 'hit');
  showReactionIndicator(state.targetX, state.targetY - getTargetSize(), reactionMs, true);
  updateHUD();

  // Combo burst animation
  const comboEl = DOM.hudCombo.parentElement;
  comboEl.classList.remove('combo-burst');
  void comboEl.offsetWidth;
  comboEl.classList.add('combo-burst');

  // Check precision mode end
  if (state.mode === 'precision') {
    state.shots++;
    if (state.shots >= GAME_MODE.precision.maxShots) { endGame(); return; }
  }

  scheduleNextTarget();
}

function targetMissed(fromTimeout = false) {
  if (!state.running) return;

  state.misses++;
  state.combo = 0;

  // Survival mode: penalty
  if (state.mode === 'survival') {
    state.timeLeft = Math.max(0, state.timeLeft - DIFFICULTY[state.difficulty].missTimePenalty);
  }

  SFX.miss();

  if (!fromTimeout) {
    // Visual miss flash
    DOM.gameArea.classList.remove('miss-flash');
    void DOM.gameArea.offsetWidth;
    DOM.gameArea.classList.add('miss-flash');
  }

  hideTarget();
  updateHUD();

  if (state.mode === 'precision') {
    state.shots++;
    if (state.shots >= GAME_MODE.precision.maxShots) { endGame(); return; }
  }

  scheduleNextTarget();
}

// ═══════════════════════════════════════════════════════════
//  REACTION INDICATOR
// ═══════════════════════════════════════════════════════════

function showReactionIndicator(x, y, ms, isHit) {
  const el = DOM.reactionInd;
  el.className = 'reaction-indicator';
  el.style.left = x + 'px';
  el.style.top  = y + 'px';
  el.style.color = isHit ? 'var(--neon-green)' : 'var(--neon-red)';
  el.textContent = ms + 'ms';
  void el.offsetWidth;
  el.classList.remove('hidden');
  clearTimeout(el._timeout);
  el._timeout = setTimeout(() => el.classList.add('hidden'), 800);
}

// ═══════════════════════════════════════════════════════════
//  HUD UPDATE
// ═══════════════════════════════════════════════════════════

function updateHUD() {
  DOM.hudScore.textContent  = state.score;
  DOM.hudHits.textContent   = state.hits;
  DOM.hudMisses.textContent = state.misses;
  DOM.hudCombo.textContent  = state.combo;

  const total = state.hits + state.misses;
  const acc   = total > 0 ? Math.round((state.hits / total) * 100) : 100;
  DOM.hudAcc.textContent = acc + '%';

  if (state.reactionTimes.length > 0) {
    const avg = Math.round(state.reactionTimes.reduce((a, b) => a + b, 0) / state.reactionTimes.length);
    DOM.hudReaction.textContent = avg + 'ms';
  }

  // Timer label for precision mode
  if (state.mode === 'precision') {
    const remaining = GAME_MODE.precision.maxShots - state.shots;
    DOM.hudTimer.textContent  = remaining;
    DOM.hudTimerLbl.textContent = 'TIROS';
  }
}

// ═══════════════════════════════════════════════════════════
//  GAME TIMER
// ═══════════════════════════════════════════════════════════

function tickTimer() {
  if (state.paused) return;
  if (state.mode === 'precision') return; // no timer

  state.timeLeft = Math.max(0, state.timeLeft - 1);
  DOM.hudTimer.textContent = state.timeLeft;

  if (state.timeLeft <= 10) DOM.hudTimer.classList.add('urgent');
  else                      DOM.hudTimer.classList.remove('urgent');

  if (state.timeLeft <= 0) endGame();
}

// ═══════════════════════════════════════════════════════════
//  FPS COUNTER
// ═══════════════════════════════════════════════════════════

function fpsTick(now) {
  if (!state.running) return;
  requestAnimationFrame(fpsTick);
  state.frameCount++;
  if (now - state.fpsTimer >= 1000) {
    state.fps = state.frameCount;
    state.frameCount = 0;
    state.fpsTimer = now;
    DOM.hudFps.textContent = state.fps;
  }
}

// ═══════════════════════════════════════════════════════════
//  START GAME
// ═══════════════════════════════════════════════════════════

function startGame() {
  const modeCfg = GAME_MODE[state.mode];

  // Reset state
  Object.assign(state, {
    score: 0, hits: 0, misses: 0, combo: 0, maxCombo: 0, shots: 0,
    timeLeft: isFinite(modeCfg.duration) ? modeCfg.duration : 9999,
    running: true, paused: false,
    reactionTimes: [],
    targetVisible: false,
    spawnTimeout: null, lifetimeTimeout: null,
    frameCount: 0, fpsTimer: performance.now(),
  });

  // Reset HUD visuals
  DOM.hudTimer.classList.remove('urgent');
  DOM.hudTimerLbl.textContent = state.mode === 'precision' ? 'TIROS' : 'TEMPO';
  if (state.mode === 'precision') {
    DOM.hudTimer.textContent  = GAME_MODE.precision.maxShots;
  } else {
    DOM.hudTimer.textContent  = state.timeLeft;
  }

  showScreen('game');
  updateHUD();
  SFX.start();

  // Start timer
  clearInterval(state.gameInterval);
  if (state.mode !== 'precision') {
    state.gameInterval = setInterval(tickTimer, 1000);
  }

  // Start FPS
  requestAnimationFrame(fpsTick);

  // First target with brief delay
  state.spawnTimeout = setTimeout(spawnTarget, 600);
}

// ═══════════════════════════════════════════════════════════
//  END GAME
// ═══════════════════════════════════════════════════════════

function endGame() {
  state.running = false;
  clearInterval(state.gameInterval);
  clearTimeout(state.spawnTimeout);
  clearTimeout(state.lifetimeTimeout);
  hideTarget();
  DOM.hudTimer.classList.remove('urgent');

  SFX.end();

  // Compute stats
  const total    = state.hits + state.misses;
  const accuracy = total > 0 ? Math.round((state.hits / total) * 100) : 0;
  const avgReact = state.reactionTimes.length > 0
    ? Math.round(state.reactionTimes.reduce((a, b) => a + b, 0) / state.reactionTimes.length) : null;
  const bestReact = state.reactionTimes.length > 0 ? Math.min(...state.reactionTimes) : null;

  // Persist
  const data = loadStorage();
  let newRecord = false;
  if (state.score > data.bestScore)     { data.bestScore = state.score; newRecord = true; }
  if (!data.bestReaction || (bestReact && bestReact < data.bestReaction)) { data.bestReaction = bestReact; }
  if (accuracy > data.bestAccuracy)     { data.bestAccuracy = accuracy; }

  // Rankings
  data.rankings = data.rankings || [];
  data.rankings.push({
    score: state.score,
    accuracy,
    avgReact,
    mode: GAME_MODE[state.mode].label,
    difficulty: DIFFICULTY[state.difficulty].label,
    date: new Date().toLocaleDateString('pt-BR'),
  });
  data.rankings.sort((a, b) => b.score - a.score);
  data.rankings = data.rankings.slice(0, 10);
  saveStorage(data);

  // Show result screen
  setTimeout(() => showResultScreen(accuracy, avgReact, bestReact, newRecord), 400);
}

// ═══════════════════════════════════════════════════════════
//  RESULT SCREEN
// ═══════════════════════════════════════════════════════════

function showResultScreen(accuracy, avgReact, bestReact, newRecord) {
  const modeLabel = GAME_MODE[state.mode].label;
  const diffLabel = DIFFICULTY[state.difficulty].label;

  DOM.resultModetag.textContent = `${modeLabel} • ${diffLabel}`;
  DOM.resultScore.textContent   = state.score;
  DOM.resHits.textContent       = state.hits;
  DOM.resMisses.textContent     = state.misses;
  DOM.resAccuracy.textContent   = accuracy + '%';
  DOM.resAvgReact.textContent   = avgReact ? avgReact + 'ms' : '—';
  DOM.resBestReact.textContent  = bestReact ? bestReact + 'ms' : '—';
  DOM.resMaxCombo.textContent   = state.maxCombo;
  DOM.resultNewRec.classList.toggle('hidden', !newRecord);

  drawReactionChart();
  renderRanking();
  showScreen('result');
}

// ═══════════════════════════════════════════════════════════
//  REACTION CHART (Canvas)
// ═══════════════════════════════════════════════════════════

function drawReactionChart() {
  const canvas = DOM.reactionChart;
  const ctx    = canvas.getContext('2d');
  const times  = state.reactionTimes;
  const W = canvas.offsetWidth || 600;
  const H = canvas.height;
  canvas.width = W;

  ctx.clearRect(0, 0, W, H);

  if (times.length < 2) {
    ctx.fillStyle = 'rgba(90,106,130,.5)';
    ctx.font = '12px "Share Tech Mono"';
    ctx.textAlign = 'center';
    ctx.fillText('Dados insuficientes', W / 2, H / 2);
    return;
  }

  const maxT = Math.max(...times);
  const minT = Math.min(...times);
  const pad  = 12;
  const chartW = W - pad * 2;
  const chartH = H - pad * 2;

  // Grid line
  ctx.strokeStyle = 'rgba(90,106,130,.2)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(pad, H / 2); ctx.lineTo(W - pad, H / 2); ctx.stroke();

  // Avg line
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const avgY = pad + chartH - ((avg - minT) / (maxT - minT + 1)) * chartH;
  ctx.strokeStyle = 'rgba(0,245,212,.3)';
  ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(pad, avgY); ctx.lineTo(W - pad, avgY); ctx.stroke();
  ctx.setLineDash([]);

  // Bars
  const barW = Math.min(18, chartW / times.length - 2);
  times.forEach((t, i) => {
    const x = pad + (i / (times.length - 1)) * chartW;
    const norm = (t - minT) / (maxT - minT + 1);
    const barH = Math.max(4, norm * chartH);
    const y = pad + chartH - barH;

    // Color: fast = green, slow = red
    const ratio = norm;
    const r = Math.round(ratio * 255);
    const g = Math.round((1 - ratio) * 255);
    ctx.fillStyle = `rgba(${r},${g},80,.8)`;
    ctx.fillRect(x - barW / 2, y, barW, barH);
  });

  // Labels
  ctx.fillStyle = 'rgba(90,106,130,.8)';
  ctx.font = '10px "Share Tech Mono"';
  ctx.textAlign = 'left';
  ctx.fillText(minT + 'ms', pad, H - 2);
  ctx.textAlign = 'right';
  ctx.fillText(maxT + 'ms', W - pad, H - 2);
}

// ═══════════════════════════════════════════════════════════
//  RANKING
// ═══════════════════════════════════════════════════════════

function renderRanking() {
  const data = loadStorage();
  const list = data.rankings || [];
  DOM.rankingList.innerHTML = '';

  if (list.length === 0) {
    DOM.rankingList.innerHTML = '<li style="color:var(--text-dim);font-family:var(--font-mono);font-size:.72rem;padding:8px">Sem registros ainda.</li>';
    return;
  }

  list.forEach((entry, i) => {
    const li = document.createElement('li');
    li.className = 'ranking-item';
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
    li.innerHTML = `
      <span class="rank-pos">${medal}</span>
      <span class="rank-meta">${entry.mode} • ${entry.difficulty} • ${entry.accuracy}% • ${entry.date}</span>
      <span class="rank-score">${entry.score} pts</span>`;
    DOM.rankingList.appendChild(li);
  });
}

// ═══════════════════════════════════════════════════════════
//  PAUSE / RESUME
// ═══════════════════════════════════════════════════════════

function pauseGame() {
  if (!state.running) return;
  state.paused = true;
  clearTimeout(state.spawnTimeout);
  clearTimeout(state.lifetimeTimeout);
  hideTarget();
  DOM.pauseOverlay.classList.remove('hidden');
}

function resumeGame() {
  state.paused = false;
  DOM.pauseOverlay.classList.add('hidden');
  scheduleNextTarget();
}

// ═══════════════════════════════════════════════════════════
//  INPUT HANDLING
// ═══════════════════════════════════════════════════════════

function handleGameAreaClick(e) {
  if (!state.running || state.paused) return;

  const rect = DOM.gameArea.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;

  if (state.targetVisible) {
    // Check if click hit the target
    const size = getTargetSize();
    const dx = clickX - state.targetX;
    const dy = clickY - state.targetY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= size / 2) {
      targetHit(e.clientX, e.clientY);
    } else {
      targetMissed(false);
      spawnRipple(e.clientX, e.clientY, 'miss');
    }
  } else {
    // Clicked when no target visible = miss
    state.misses++;
    state.combo = 0;
    SFX.miss();
    spawnRipple(e.clientX, e.clientY, 'miss');
    DOM.gameArea.classList.remove('miss-flash');
    void DOM.gameArea.offsetWidth;
    DOM.gameArea.classList.add('miss-flash');
    updateHUD();
  }
}

// ═══════════════════════════════════════════════════════════
//  MENU CONFIG
// ═══════════════════════════════════════════════════════════

DOM.modeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    DOM.modeBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.mode = btn.dataset.mode;
  });
});

DOM.diffBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    DOM.diffBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.difficulty = btn.dataset.diff;
  });
});

DOM.btnStart.addEventListener('click', startGame);

DOM.btnPause.addEventListener('click', () => {
  if (state.paused) resumeGame(); else pauseGame();
});
DOM.btnResume.addEventListener('click', resumeGame);
DOM.btnQuit.addEventListener('click', () => {
  state.running = false;
  clearInterval(state.gameInterval);
  clearTimeout(state.spawnTimeout);
  clearTimeout(state.lifetimeTimeout);
  hideTarget();
  DOM.pauseOverlay.classList.add('hidden');
  showScreen('menu');
  updateMenuBests();
});

DOM.gameArea.addEventListener('click', handleGameAreaClick);

// Touch support
DOM.gameArea.addEventListener('touchstart', e => {
  e.preventDefault();
  const touch = e.changedTouches[0];
  handleGameAreaClick({ clientX: touch.clientX, clientY: touch.clientY });
}, { passive: false });

DOM.btnRetry.addEventListener('click', startGame);
DOM.btnMenu.addEventListener('click', () => {
  showScreen('menu');
  updateMenuBests();
});

// Keyboard
document.addEventListener('keydown', e => {
  if (e.code === 'Escape') {
    if (state.running) { if (state.paused) resumeGame(); else pauseGame(); }
  }
  if (e.code === 'Space' && state.running) {
    e.preventDefault();
    if (state.paused) resumeGame(); else pauseGame();
  }
});

// ═══════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════

updateMenuBests();
showScreen('menu');

// Redraw chart on resize
window.addEventListener('resize', () => {
  if (DOM.screens.result.classList.contains('active')) drawReactionChart();
});
