// ===================== CANVAS =====================
const canvas = document.getElementById('tetris');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
// scale applied each frame via setTransform(20,0,0,20,0,0)

const nextCanvas = document.getElementById('next-piece');
const nextCtx = nextCanvas ? nextCanvas.getContext('2d') : null;
const holdCanvas = document.getElementById('hold-piece');
const holdCtx = holdCanvas ? holdCanvas.getContext('2d') : null;
if (nextCtx) nextCtx.imageSmoothingEnabled = false;
if (holdCtx) holdCtx.imageSmoothingEnabled = false;

// ===================== STATE =====================
let score = 0;
let highScore = parseInt(localStorage.getItem('tetrisHighScore') || '0', 10);
let balance = parseInt(localStorage.getItem('tetrisBalance') || '0', 10);
let level = 1;
let linesCleared = 0;
let dropInterval = 1000;
let lastTime = 0;
let dropCounter = 0;
let paused = false;
let gameOver = false;
let combo = 0;
let gameMode = 'classic'; // classic | sprint | zen | hunger
let sprintTarget = 40;
let sprintStart = 0;
let sprintElapsed = 0;
let holdMatrix = null;
let holdLocked = false;
let particles = [];
let shakeTime = 0;
let softDropping = false;
let lastRotateWasKick = false;
let hungerTimer = 0;
let hungerInterval = 12000;
let duelId = null;
let duelOppScore = 0;
let duelUnsub = null;
let lineFlashRows = [];
let lineFlashTime = 0;

// Settings
const settings = Object.assign({
  sound: true, vibrate: true, ghost: true, skin: 'classic', das: 250
}, JSON.parse(localStorage.getItem('tetrisSettings') || '{}'));

function saveSettings() {
  localStorage.setItem('tetrisSettings', JSON.stringify(settings));
}

const SKINS = {
  classic: [null, '#FF0D72', '#0DC2FF', '#0DFF72', '#F538FF', '#FF8E0D', '#FFE138', '#3877FF'],
  neon:    [null, '#ff00aa', '#00f0ff', '#39ff14', '#bf00ff', '#ff6b00', '#ffff00', '#00a2ff'],
  glass:   [null, '#f9a8d4', '#a5f3fc', '#bbf7d0', '#e9d5ff', '#fed7aa', '#fef08a', '#bfdbfe'],
  pastel:  [null, '#f472b6', '#67e8f9', '#86efac', '#c4b5fd', '#fdba74', '#fde047', '#93c5fd'],
  mono:    [null, '#e2e8f0', '#cbd5e1', '#94a3b8', '#f1f5f9', '#64748b', '#e2e8f0', '#cbd5e1'],
};
let colors = SKINS[settings.skin] || SKINS.classic;

// ===================== THEMES =====================
const themes = [
  'theme','chipmunk','glent','billy','pidors','bosinn','billyv2','edit',
  'gigachad','maga','sneakedup','goblingang','sexibetmen','sigma',
  'ricardomillos','trollface','kobyakov','chipichapa','whatsapp','rickroll','billyv3','repo','dance','dante','josh','repov2','tvorog','chicken','billyv4','music','crocodile','dantev2','rooster','goose','musicv2','romapro','creeper','roosterv2','toilet','ratdance','kingvon','musicv3','breto','roosterv3','mactraher','legday','laser','dragon','trollfacev2','endoskeleton'
];
const bought = {};
const active = {};
const savedBought = JSON.parse(localStorage.getItem('tetrisBought') || '{}');
themes.forEach(t => { bought[t] = !!savedBought[t]; active[t] = false; });

// ===================== ACHIEVEMENTS =====================
const ACHIEVEMENTS = [
  { id: 'first_line', name: 'Первая линия', desc: 'Очисти 1 линию', check: s => s.totalLines >= 1 },
  { id: 'lines_40', name: 'Спринтер', desc: 'Очисти 40 линий за всё время', check: s => s.totalLines >= 40 },
  { id: 'lines_200', name: 'Марафонец', desc: 'Очисти 200 линий', check: s => s.totalLines >= 200 },
  { id: 'score_5k', name: '5K', desc: 'Набери 5000 очков за игру', check: s => s.bestScore >= 5000 },
  { id: 'score_20k', name: '20K', desc: 'Набери 20000 очков за игру', check: s => s.bestScore >= 20000 },
  { id: 'tetris', name: 'Тетрис!', desc: 'Очисти 4 линии сразу', check: s => s.tetrises >= 1 },
  { id: 'combo3', name: 'Комбо x3', desc: 'Сделай комбо x3', check: s => s.maxCombo >= 3 },
  { id: 'combo5', name: 'Комбо x5', desc: 'Сделай комбо x5', check: s => s.maxCombo >= 5 },
  { id: 'level10', name: 'Уровень 10', desc: 'Достигни 10 уровня', check: s => s.maxLevel >= 10 },
  { id: 'sprint_finish', name: 'Спринт пройден', desc: 'Пройди спринт 40L', check: s => s.sprints >= 1 },
  { id: 'buyer', name: 'Шопоголик', desc: 'Купи 3 темы', check: s => s.themesBought >= 3 },
  { id: 'collector', name: 'Коллекционер', desc: 'Купи 10 тем', check: s => s.themesBought >= 10 },
  { id: 'case_open', name: 'Удача', desc: 'Открой кейс', check: s => s.casesOpened >= 1 },
  { id: 'tspin', name: 'T-Spin', desc: 'Сделай T-Spin', check: s => (s.tspins || 0) >= 1 },
  { id: 'hunger_surv', name: 'Выживший', desc: 'Очисти 20 линий в Голоде', check: s => (s.hungerLines || 0) >= 20 },
  { id: 'profile_5', name: 'Уровень 5', desc: 'Профиль 5 уровня', check: s => profileLevel() >= 5 },
  { id: 'profile_10', name: 'Уровень 10', desc: 'Профиль 10 уровня', check: s => profileLevel() >= 10 },
  { id: 'duel_win', name: 'Дуэлянт', desc: 'Выиграй дуэль', check: s => (s.duelWins || 0) >= 1 },
];

let stats = JSON.parse(localStorage.getItem('tetrisStats') || '{}');
stats = Object.assign({
  totalLines: 0, bestScore: 0, tetrises: 0, maxCombo: 0,
  maxLevel: 1, sprints: 0, themesBought: 0, casesOpened: 0,
  tspins: 0, hungerLines: 0, unlocked: {}
}, stats);

function profileLevel() {
  return Math.floor((stats.totalLines || 0) / 25) + 1;
}
function profileXP() {
  return (stats.totalLines || 0) % 25;
}
function updateProfileUI() {
  const lv = document.getElementById('profile-level');
  const xp = document.getElementById('profile-xp');
  const fill = document.getElementById('xp-fill');
  const level = profileLevel();
  const cur = profileXP();
  if (lv) lv.textContent = level;
  if (xp) xp.textContent = cur + '/25 XP';
  if (fill) fill.style.width = (cur / 25 * 100) + '%';
}

function saveStats() {
  localStorage.setItem('tetrisStats', JSON.stringify(stats));
}

function checkAchievements() {
  let newOnes = [];
  ACHIEVEMENTS.forEach(a => {
    if (!stats.unlocked[a.id] && a.check(stats)) {
      stats.unlocked[a.id] = Date.now();
      newOnes.push(a);
    }
  });
  if (newOnes.length) {
    saveStats();
    newOnes.forEach(a => toast('🏆 ' + a.name));
  }
}

function renderAchievements() {
  const list = document.getElementById('achievements-list');
  if (!list) return;
  list.innerHTML = ACHIEVEMENTS.map(a => {
    const done = !!stats.unlocked[a.id];
    return `<div class="list-item ${done ? 'done' : ''}">
      <div class="li-icon">${done ? '✅' : '🔒'}</div>
      <div class="li-body"><div class="li-name">${a.name}</div><div class="li-desc">${a.desc}</div></div>
    </div>`;
  }).join('');
}

// ===================== DAILY QUESTS =====================
function todayKey() {
  const d = new Date();
  return d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate();
}

const QUEST_POOL = [
  { id: 'q_lines10', name: 'Очисти 10 линий', target: 10, reward: 'lines', reward: 300 },
  { id: 'q_lines25', name: 'Очисти 25 линий', target: 25, key: 'lines', reward: 600 },
  { id: 'q_score2k', name: 'Набери 2000 очков', target: 2000, key: 'score', reward: 400 },
  { id: 'q_tetris', name: 'Сделай 1 тетрис', target: 1, key: 'tetris', reward: 500 },
  { id: 'q_combo', name: 'Комбо x3', target: 3, key: 'combo', reward: 450 },
  { id: 'q_play', name: 'Сыграй 3 партии', target: 3, key: 'games', reward: 350 },
];

let quests = JSON.parse(localStorage.getItem('tetrisQuests') || 'null');
if (!quests || quests.date !== todayKey()) {
  // pick 3 random
  const shuffled = QUEST_POOL.slice().sort(() => Math.random() - 0.5).slice(0, 3);
  quests = {
    date: todayKey(),
    items: shuffled.map(q => ({ ...q, progress: 0, claimed: false }))
  };
  localStorage.setItem('tetrisQuests', JSON.stringify(quests));
}

function questProgress(key, amount) {
  let changed = false;
  quests.items.forEach(q => {
    if (q.claimed) return;
    if (q.key === key) {
      q.progress = Math.min(q.target, q.progress + amount);
      changed = true;
      if (q.progress >= q.target && !q.claimed) {
        // auto-ready
      }
    }
  });
  if (changed) localStorage.setItem('tetrisQuests', JSON.stringify(quests));
}

function renderQuests() {
  const list = document.getElementById('quests-list');
  const dateEl = document.getElementById('quests-date');
  if (dateEl) dateEl.textContent = 'Сегодня · ' + quests.date;
  if (!list) return;
  list.innerHTML = quests.items.map((q, i) => {
    const ready = q.progress >= q.target;
    const pct = Math.min(100, Math.floor(q.progress / q.target * 100));
    return `<div class="list-item ${q.claimed ? 'done' : ready ? 'ready' : ''}">
      <div class="li-body" style="flex:1">
        <div class="li-name">${q.name}</div>
        <div class="li-desc">${q.progress}/${q.target} · 💎 ${q.reward}</div>
        <div class="quest-bar"><div class="quest-fill" style="width:${pct}%"></div></div>
      </div>
      <button class="quest-claim" data-qi="${i}" ${(!ready || q.claimed) ? 'disabled' : ''}>${q.claimed ? '✓' : 'Забрать'}</button>
    </div>`;
  }).join('');
  list.querySelectorAll('.quest-claim').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = +btn.dataset.qi;
      const q = quests.items[i];
      if (q.claimed || q.progress < q.target) return;
      q.claimed = true;
      balance += q.reward;
      updateBalance();
      localStorage.setItem('tetrisQuests', JSON.stringify(quests));
      toast('💎 +' + q.reward);
      renderQuests();
      sfx('coin');
    });
  });
}

// ===================== SFX (Web Audio) =====================
let audioCtx;
function ensureAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}

function sfx(type) {
  if (!settings.sound) return;
  ensureAudio();
  if (!audioCtx) return;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.connect(g); g.connect(audioCtx.destination);
  const now = audioCtx.currentTime;
  if (type === 'move') {
    o.frequency.value = 180; g.gain.value = 0.03;
    o.type = 'square'; o.start(now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.05); o.stop(now + 0.05);
  } else if (type === 'rotate') {
    o.frequency.value = 320; g.gain.value = 0.04;
    o.type = 'square'; o.start(now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.06); o.stop(now + 0.06);
  } else if (type === 'drop') {
    o.frequency.value = 120; g.gain.value = 0.05;
    o.type = 'triangle'; o.start(now); o.frequency.exponentialRampToValueAtTime(60, now + 0.1);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.12); o.stop(now + 0.12);
  } else if (type === 'line') {
    o.frequency.value = 440; g.gain.value = 0.06;
    o.type = 'square'; o.start(now); o.frequency.exponentialRampToValueAtTime(880, now + 0.15);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.2); o.stop(now + 0.2);
  } else if (type === 'tetris') {
    o.frequency.value = 523; g.gain.value = 0.08;
    o.type = 'sawtooth'; o.start(now); o.frequency.exponentialRampToValueAtTime(1046, now + 0.25);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.3); o.stop(now + 0.3);
  } else if (type === 'hold') {
    o.frequency.value = 260; g.gain.value = 0.04;
    o.type = 'sine'; o.start(now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.08); o.stop(now + 0.08);
  } else if (type === 'gameover') {
    o.frequency.value = 200; g.gain.value = 0.08;
    o.type = 'sawtooth'; o.start(now); o.frequency.exponentialRampToValueAtTime(50, now + 0.5);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.55); o.stop(now + 0.55);
  } else if (type === 'coin') {
    o.frequency.value = 800; g.gain.value = 0.05;
    o.type = 'sine'; o.start(now); o.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.15); o.stop(now + 0.15);
  } else if (type === 'level') {
    o.frequency.value = 400; g.gain.value = 0.05;
    o.type = 'square'; o.start(now); o.frequency.setValueAtTime(600, now + 0.08);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.2); o.stop(now + 0.2);
  }
}

function vibrate(ms) {
  if (!settings.vibrate) return;
  try { if (navigator.vibrate) navigator.vibrate(ms); } catch(e) {}
}

// ===================== TOAST =====================
function toast(msg) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2200);
}

// ===================== DOM =====================
const gameDiv = document.getElementById('game');
const shopDiv = document.getElementById('shop-screen');
const easterDiv = document.getElementById('easter-screen');
const modeScreen = document.getElementById('mode-screen');
const goScreen = document.getElementById('gameover-screen');
const searchInput = document.getElementById('search');
const shopItems = document.querySelectorAll('.shop-item');

if (searchInput) {
  searchInput.addEventListener('input', function() {
    const q = this.value.toLowerCase();
    shopItems.forEach(item => {
      item.style.display = item.innerText.toLowerCase().includes(q) ? '' : 'none';
    });
  });
}

const mellMusic = document.getElementById('mell-music');
const vids = {};
themes.slice(1).forEach(t => {
  const el = document.getElementById(`${t}-video`);
  if (el) {
    vids[t] = el;
    // lazy: don't load until bought/activated
    el.preload = 'none';
  }
});


// ===================== THEME OF THE DAY =====================
function themeOfDay() {
  const day = Math.floor(Date.now() / 86400000);
  const list = themes.filter(t => t !== 'theme');
  return list[day % list.length];
}
function setupThemeOfDay() {
  const tid = themeOfDay();
  const nameEl = document.getElementById('tod-name');
  if (nameEl) nameEl.textContent = tid;
  document.getElementById('tod-apply')?.addEventListener('click', () => {
    themes.forEach(x => active[x] = false);
    active[tid] = true;
    if (mellMusic) { mellMusic.pause(); mellMusic.currentTime = 0; }
    Object.values(vids).forEach(v => { try { v.pause(); v.currentTime = 0; } catch(e){} });
    const v = vids[tid];
    if (v) {
      if (v.preload === 'none') { v.preload = 'auto'; v.load(); }
      v.play().catch(() => {});
    }
    toast('Тема дня: ' + tid);
    sfx('coin');
  });
}

const mellBG = new Image();
mellBG.src = 'https://avatars.mds.yandex.net/i?id=f929b30edd21b71bed35148895c13bd3_l-4531164-images-thumbs&n=13';

function updateScore() {
  const sv = document.getElementById('score-val');
  const hv = document.getElementById('high-val');
  const lv = document.getElementById('level-val');
  const ln = document.getElementById('lines-val');
  const cv = document.getElementById('combo-val');
  const cc = document.getElementById('combo-card');
  if (sv) sv.textContent = score;
  if (hv) hv.textContent = highScore;
  if (lv) lv.textContent = level;
  if (ln) ln.textContent = linesCleared;
  if (cv) cv.textContent = 'x' + combo;
  if (cc) cc.style.display = combo > 1 ? '' : 'none';
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('tetrisHighScore', highScore);
    if (hv) hv.textContent = highScore;
  }
  if (gameMode === 'duel') {
    publishDuelScore();
    if (score >= 3000 && !gameOver) {
      endGame(true);
      toast('⚔️ Победа в дуэли!');
    }
  }
}

function updateBalance() {
  const bn = document.getElementById('balance-num');
  if (bn) bn.textContent = balance;
  localStorage.setItem('tetrisBalance', balance);
}

function saveBought() {
  localStorage.setItem('tetrisBought', JSON.stringify(bought));
}

// ===================== SHOP BUY =====================
themes.forEach(function(t) {
  var buyBtn = document.getElementById('buy-' + t);
  var actionsDiv = document.getElementById(t + '-actions');
  if (!buyBtn || !actionsDiv) return;
  if (bought[t]) {
    buyBtn.style.display = 'none';
    actionsDiv.style.display = 'flex';
  }
  buyBtn.addEventListener('click', async function() {
    if (!bought[t] && balance >= 200) {
      balance -= 200;
      bought[t] = true;
      updateBalance();
      saveBought();
      stats.themesBought = Object.values(bought).filter(Boolean).length;
      saveStats();
      checkAchievements();
      buyBtn.disabled = true;
      buyBtn.textContent = 'Загрузка...';
      try {
        var videoElem = document.getElementById(t + '-video');
        if (t === 'theme' && mellMusic) {
          // already local
        } else if (videoElem && videoElem.preload === 'none') {
          videoElem.preload = 'auto';
          videoElem.load();
        }
        buyBtn.style.display = 'none';
        actionsDiv.style.display = 'flex';
        toast('Тема куплена!');
        sfx('coin');
      } catch (err) {
        buyBtn.style.display = 'none';
        actionsDiv.style.display = 'flex';
      }
    } else if (!bought[t]) {
      alert('Недостаточно очков');
    }
  });
});

themes.forEach(t => {
  const applyBtn = document.getElementById('apply-' + t);
  const removeBtn = document.getElementById('remove-' + t);
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      themes.forEach(x => active[x] = false);
      active[t] = true;
      if (mellMusic) { mellMusic.pause(); mellMusic.currentTime = 0; }
      Object.values(vids).forEach(v => { v.pause(); v.currentTime = 0; });
      if (t === 'theme' && mellMusic) mellMusic.play().catch(() => {});
      else if (vids[t]) {
        if (vids[t].preload === 'none') { vids[t].preload = 'auto'; vids[t].load(); }
        vids[t].play().catch(() => {});
      }
    });
  }
  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      active[t] = false;
      if (t === 'theme' && mellMusic) { mellMusic.pause(); mellMusic.currentTime = 0; }
      else if (vids[t]) { vids[t].pause(); vids[t].currentTime = 0; }
    });
  }
});

// ===================== SCREENS =====================
function showScreen(el) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active-screen');
    s.style.display = 'none';
    s.style.opacity = '';
    s.style.pointerEvents = '';
  });
  if (!el) return;
  el.style.display = 'flex';
  el.style.opacity = '1';
  el.style.pointerEvents = 'auto';
  el.classList.add('active-screen');
}

document.getElementById('shop')?.addEventListener('click', () => {
  showScreen(shopDiv);
  paused = true;
});
document.getElementById('return-shop')?.addEventListener('click', () => {
  showScreen(gameDiv);
  paused = false;
});
document.getElementById('easter-egg')?.addEventListener('click', () => {
  showScreen(easterDiv);
  paused = true;
});
document.getElementById('return')?.addEventListener('click', () => {
  showScreen(gameDiv);
  paused = false;
});
document.getElementById('menu-btn')?.addEventListener('click', () => {
  paused = true;
  showScreen(modeScreen);
});

// Mode select (delegation — надёжнее)
document.querySelector('.mode-list')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.mode-card');
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation();
  const mode = btn.getAttribute('data-mode') || 'classic';
  if (mode === 'duel') {
    if (!currentUser) {
      toast('Сначала войди или зарегистрируйся');
      showScreen(document.getElementById('auth-screen'));
      return;
    }
    openDuelLobby();
    return;
  }
  gameMode = mode;
  ensureAudio();
  try {
    startGame();
  } catch (err) {
    console.error('startGame', err);
    toast('Ошибка старта: ' + err.message);
    return;
  }
  showScreen(gameDiv);
  paused = false;
  gameOver = false;
  lastTime = performance.now();
  dropCounter = 0;
});

document.getElementById('open-achievements')?.addEventListener('click', () => {
  renderAchievements();
  showScreen(document.getElementById('achievements-screen'));
});
document.getElementById('ach-back')?.addEventListener('click', () => showScreen(modeScreen));
document.getElementById('open-quests')?.addEventListener('click', () => {
  renderQuests();
  showScreen(document.getElementById('quests-screen'));
});
document.getElementById('quests-back')?.addEventListener('click', () => showScreen(modeScreen));

// Easter secret
const secretBtn = document.getElementById('secret-btn');
if (secretBtn) {
  const secretMenu = document.createElement('div');
  secretMenu.id = 'secret-menu';
  Object.assign(secretMenu.style, {
    position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh',
    background: 'rgba(0,0,0,0.92)', display: 'none', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', zIndex: 1000
  });
  const secretImg = document.createElement('img');
  secretImg.src = 'secret.png';
  secretImg.style.maxWidth = '80%';
  secretImg.style.maxHeight = '80%';
  const closeSecret = document.createElement('button');
  closeSecret.textContent = 'Закрыть';
  closeSecret.className = 'primary-btn';
  closeSecret.style.marginTop = '20px';
  secretMenu.append(secretImg, closeSecret);
  document.body.appendChild(secretMenu);
  secretBtn.addEventListener('click', () => { secretMenu.style.display = 'flex'; });
  closeSecret.addEventListener('click', () => { secretMenu.style.display = 'none'; });
}



// ===================== SEASON PASS =====================
const SEASON_REWARDS = [
  { level: 1, reward: 100, label: '100 💎' },
  { level: 2, reward: 150, label: '150 💎' },
  { level: 3, reward: 200, label: '200 💎' },
  { level: 5, reward: 400, label: '400 💎' },
  { level: 7, reward: 500, label: '500 💎' },
  { level: 10, reward: 1000, label: '1000 💎 + титул' },
  { level: 15, reward: 1500, label: '1500 💎' },
  { level: 20, reward: 2500, label: '2500 💎 Легенда' },
];
let seasonClaimed = {};
try { seasonClaimed = JSON.parse(localStorage.getItem('tetrisSeason') || '{}') || {}; } catch(e) { seasonClaimed = {}; }

function renderSeason() {
  const list = document.getElementById('season-list');
  if (!list) return;
  const lvl = profileLevel();
  list.innerHTML = SEASON_REWARDS.map(r => {
    const claimed = !!seasonClaimed[r.level];
    const ready = lvl >= r.level && !claimed;
    return `<div class="list-item ${claimed ? 'done' : ready ? 'ready' : ''}">
      <div class="li-icon">${claimed ? '✅' : ready ? '🎁' : '🔒'}</div>
      <div class="li-body" style="flex:1">
        <div class="li-name">Уровень ${r.level}</div>
        <div class="li-desc">${r.label}${lvl >= r.level ? '' : ' · нужно ур. ' + r.level}</div>
      </div>
      <button class="quest-claim season-claim" data-lv="${r.level}" ${ready ? '' : 'disabled'}>
        ${claimed ? '✓' : ready ? 'Забрать' : 'Ур.' + r.level}
      </button>
    </div>`;
  }).join('');
  list.querySelectorAll('.season-claim').forEach(btn => {
    btn.onclick = () => {
      const lv = +btn.getAttribute('data-lv');
      const r = SEASON_REWARDS.find(x => x.level === lv);
      if (!r || seasonClaimed[lv] || profileLevel() < lv) return;
      seasonClaimed[lv] = true;
      localStorage.setItem('tetrisSeason', JSON.stringify(seasonClaimed));
      balance += r.reward;
      updateBalance();
      toast('🎟️ Сезон: +' + r.reward + ' 💎');
      sfx('coin');
      renderSeason();
    };
  });
}

document.getElementById('open-season')?.addEventListener('click', () => {
  renderSeason();
  showScreen(document.getElementById('season-screen'));
});
document.getElementById('season-back')?.addEventListener('click', () => showScreen(modeScreen));


// Settings UI
function bindSettings() {
  const map = [
    ['set-sound', 'sound', 'checked'],
    ['set-vibrate', 'vibrate', 'checked'],
    ['set-ghost', 'ghost', 'checked'],
    ['set-skin', 'skin', 'value'],
    ['set-das', 'das', 'value'],
    ['set-arr', 'arr', 'value'],
  ];
  map.forEach(([id, key, prop]) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (prop === 'checked') el.checked = !!settings[key];
    else el.value = String(settings[key]);
    el.addEventListener('change', () => {
      settings[key] = prop === 'checked' ? el.checked : ((key === 'das' || key === 'arr') ? +el.value : el.value);
      if (key === 'skin') colors = SKINS[settings.skin] || SKINS.classic;
      saveSettings();
    });
  });
  colors = SKINS[settings.skin] || SKINS.classic;
}
document.getElementById('open-settings')?.addEventListener('click', () => {
  showScreen(document.getElementById('settings-screen'));
});
document.getElementById('settings-back')?.addEventListener('click', () => showScreen(modeScreen));
document.getElementById('open-leaderboard')?.addEventListener('click', () => {
  renderLeaderboard();
  showScreen(document.getElementById('leaderboard-screen'));
});
document.getElementById('lb-back')?.addEventListener('click', () => showScreen(modeScreen));

function getPlayerName() {
  let name = localStorage.getItem('tetrisName');
  if (!name) {
    name = 'Игрок' + Math.floor(Math.random() * 9000 + 1000);
    localStorage.setItem('tetrisName', name);
  }
  return name;
}

function getLocalScores() {
  try { return JSON.parse(localStorage.getItem('tetrisLocalScores') || '[]') || []; }
  catch(e) { return []; }
}

function saveLocalScore(entry) {
  let rows = getLocalScores();
  rows.push(entry);
  rows.sort((a, b) => (b.score || 0) - (a.score || 0));
  rows = rows.slice(0, 30);
  localStorage.setItem('tetrisLocalScores', JSON.stringify(rows));
  return rows;
}

function submitScore(sc) {
  if (!sc || sc <= 0) return;
  const entry = { name: getPlayerName(), score: sc, mode: gameMode, ts: Date.now() };
  saveLocalScore(entry);
  try {
    if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length) {
      firebase.database().ref('/scores').push(entry);
    }
  } catch (e) { console.warn('submitScore firebase', e); }
}

function renderLeaderboardRows(rows, list, source) {
  if (!rows.length) {
    list.innerHTML = '<div class="list-item"><div class="li-desc">Пока пусто — сыграй партию!</div></div>';
    return;
  }
  list.innerHTML = rows.slice(0, 20).map((r, i) =>
    `<div class="list-item"><div class="li-icon">${i===0?'🥇':i===1?'🥈':i===2?'🥉':'#'+(i+1)}</div>
    <div class="li-body"><div class="li-name">${r.name||'?'}</div>
    <div class="li-desc">${r.score} · ${r.mode||''}</div></div></div>`
  ).join('') + `<div class="list-item"><div class="li-desc" style="text-align:center;width:100%">Источник: ${source}</div></div>`;
}

function renderLeaderboard() {
  const list = document.getElementById('leaderboard-list');
  if (!list) return;
  const local = getLocalScores().sort((a,b) => (b.score||0)-(a.score||0));
  list.innerHTML = '<div class="list-item"><div class="li-desc">Загрузка...</div></div>';

  // Always show local first so something works offline
  renderLeaderboardRows(local, list, 'локальный');

  try {
    if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) {
      return;
    }
    // Prefer simple fetch without orderBy (no index required), then sort client-side
    firebase.database().ref('/scores').limitToLast(50).once('value')
      .then(snap => {
        const rows = [];
        snap.forEach(c => { const v = c.val(); if (v && typeof v.score === 'number') rows.push(v); });
        rows.sort((a,b) => b.score - a.score);
        // merge with local
        const merged = rows.concat(local);
        const seen = new Set();
        const uniq = [];
        merged.sort((a,b) => b.score - a.score);
        for (const r of merged) {
          const k = (r.name||'') + '|' + r.score + '|' + (r.ts||'');
          if (seen.has(k)) continue;
          seen.add(k);
          uniq.push(r);
          if (uniq.length >= 20) break;
        }
        renderLeaderboardRows(uniq, list, rows.length ? 'онлайн + локальный' : 'локальный');
      })
      .catch(err => {
        console.warn('leaderboard', err);
        renderLeaderboardRows(local, list, 'локальный (сеть недоступна)');
      });
  } catch (e) {
    renderLeaderboardRows(local, list, 'локальный');
  }
}

// ===================== CASE =====================
const caseBtn = document.getElementById('case-btn');
const caseScreen = document.getElementById('case-screen');
const returnCaseBtn = document.getElementById('return-case');
const timerEl = document.getElementById('timer');
const openCaseBtn = document.getElementById('open-case');
let caseAvailableAt = parseInt(localStorage.getItem('tetrisCaseAt') || '0', 10) || (Date.now() + 5 * 60 * 1000);
const rewards = [200, 400, 600, 800, 1000, 1200, 1400, 1600, 1800, 2000];

caseBtn?.addEventListener('click', () => {
  updateCaseTimer();
  showScreen(caseScreen);
  paused = true;
});
returnCaseBtn?.addEventListener('click', () => {
  showScreen(gameDiv);
  paused = false;
});

function updateCaseTimer() {
  const diff = caseAvailableAt - Date.now();
  if (diff <= 0) {
    if (timerEl) timerEl.textContent = '00:00';
    if (openCaseBtn) openCaseBtn.disabled = false;
  } else {
    const sec = Math.floor(diff / 1000) % 60;
    const min = Math.floor(diff / 60000);
    if (timerEl) timerEl.textContent = `${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
    if (openCaseBtn) openCaseBtn.disabled = true;
    setTimeout(updateCaseTimer, 1000);
  }
}

openCaseBtn?.addEventListener('click', () => {
  const scroll = document.getElementById('case-scroll');
  if (!scroll) return;
  scroll.innerHTML = '';
  scroll.style.transition = 'none';
  scroll.style.transform = 'translateX(0)';

  // 10% chance theme reward slot
  const freeThemes = themes.filter(t => t !== 'theme' && !bought[t]);
  const giveTheme = freeThemes.length && Math.random() < 0.12;

  setTimeout(() => {
    const pool = [];
    for (let i = 0; i < 50; i++) {
      const div = document.createElement('div');
      div.className = 'case-item';
      if (giveTheme && i === 25) {
        div.textContent = '🎨 Тема!';
        div.dataset.theme = freeThemes[Math.floor(Math.random() * freeThemes.length)];
        pool.push('theme:' + div.dataset.theme);
      } else {
        const value = rewards[Math.floor(Math.random() * rewards.length)];
        div.textContent = value + ' очков';
        pool.push(value);
      }
      scroll.appendChild(div);
    }
    const stopIndex = giveTheme ? 25 : (20 + Math.floor(Math.random() * 10));
    const scrollWrapper = document.getElementById('case-scroll-wrapper');
    const itemWidth = 110;
    const wrapperWidth = scrollWrapper ? scrollWrapper.offsetWidth : 300;
    const centerOffset = (stopIndex * itemWidth) - (wrapperWidth / 2) + (itemWidth / 2);
    scroll.style.transition = 'transform 5s cubic-bezier(0.15, 0.85, 0.35, 1)';
    scroll.style.transform = `translateX(${-centerOffset}px)`;
    openCaseBtn.disabled = true;

    const reward = pool[stopIndex];
    const handleTransitionEnd = () => {
      scroll.removeEventListener('transitionend', handleTransitionEnd);
      if (typeof reward === 'string' && reward.startsWith('theme:')) {
        const tid = reward.slice(6);
        bought[tid] = true;
        saveBought();
        stats.themesBought = Object.values(bought).filter(Boolean).length;
        const buyBtn = document.getElementById('buy-' + tid);
        const actionsDiv = document.getElementById(tid + '-actions');
        if (buyBtn) buyBtn.style.display = 'none';
        if (actionsDiv) actionsDiv.style.display = 'flex';
        toast('🎨 Выпала тема: ' + tid);
        sfx('coin');
      } else {
        score += reward;
        balance += reward;
        updateScore();
        updateBalance();
        toast('+' + reward + ' очков!');
        sfx('coin');
      }
      stats.casesOpened = (stats.casesOpened || 0) + 1;
      saveStats();
      checkAchievements();
      caseAvailableAt = Date.now() + 5 * 60 * 1000;
      localStorage.setItem('tetrisCaseAt', caseAvailableAt);
      updateCaseTimer();
    };
    scroll.addEventListener('transitionend', handleTransitionEnd);
  }, 50);
});

// ===================== GAME LOGIC =====================
function createMatrix(w, h) {
  const m = [];
  while (h--) m.push(new Array(w).fill(0));
  return m;
}

const arena = createMatrix(12, 20);
const player = { pos: { x: 0, y: 0 }, matrix: null, next: null };

// colors from SKINS

function collide(arena, p) {
  const [m, o] = [p.matrix, p.pos];
  return m.some((row, y) =>
    row.some((val, x) => {
      if (!val) return false;
      const dy = y + o.y, dx = x + o.x;
      return dy < 0 || dy >= arena.length || dx < 0 || dx >= arena[0].length || arena[dy][dx] !== 0;
    })
  );
}

function createPiece(type) {
  switch (type) {
    case 'T': return [[0,0,0],[1,1,1],[0,1,0]];
    case 'O': return [[2,2],[2,2]];
    case 'L': return [[0,3,0],[0,3,0],[0,3,3]];
    case 'J': return [[0,4,0],[0,4,0],[4,4,0]];
    case 'I': return [[0,5,0,0],[0,5,0,0],[0,5,0,0],[0,5,0,0]];
    case 'S': return [[0,6,6],[6,6,0],[0,0,0]];
    case 'Z': return [[7,7,0],[0,7,7],[0,0,0]];
  }
}

function rotate(matrix, dir) {
  for (let y = 0; y < matrix.length; ++y)
    for (let x = 0; x < y; ++x)
      [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
  if (dir > 0) matrix.forEach(r => r.reverse());
  else matrix.reverse();
}

function drawMatrix(matrix, offset, alpha = 1) {
  matrix.forEach((row, y) =>
    row.forEach((val, x) => {
      if (val) {
        const dy = y + offset.y, dx = x + offset.x;
        if (dy >= 0 && dy < arena.length && dx >= 0 && dx < arena[0].length) {
          ctx.globalAlpha = alpha;
          const c = colors[val] || colors[7] || '#888';
          ctx.fillStyle = c;
          ctx.fillRect(dx, dy, 1, 1);
          if (settings.skin === 'neon') {
            ctx.strokeStyle = c;
            ctx.lineWidth = 0.08;
            ctx.globalAlpha = alpha * 0.5;
            ctx.strokeRect(dx - 0.05, dy - 0.05, 1.1, 1.1);
            ctx.globalAlpha = alpha;
          } else if (settings.skin === 'glass') {
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            ctx.fillRect(dx, dy, 1, 0.35);
          }
          ctx.strokeStyle = 'rgba(0,0,0,0.35)';
          ctx.lineWidth = 0.05;
          ctx.strokeRect(dx, dy, 1, 1);
          ctx.globalAlpha = 1;
        }
      }
    })
  );
}

function getGhostY() {
  if (!player.matrix) return 0;
  const ghost = { pos: { x: player.pos.x, y: player.pos.y }, matrix: player.matrix };
  let guard = 0;
  while (!collide(arena, ghost) && guard++ < 30) ghost.pos.y++;
  ghost.pos.y--;
  return ghost.pos.y;
}

function drawMini(targetCtx, targetCanvas, matrix) {
  if (!targetCtx || !matrix) {
    if (targetCtx && targetCanvas) {
      targetCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
      targetCtx.fillStyle = '#0a0a14';
      targetCtx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
    }
    return;
  }
  targetCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
  targetCtx.fillStyle = '#0a0a14';
  targetCtx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
  const cell = 14;
  const mw = matrix[0].length * cell;
  const mh = matrix.length * cell;
  const ox = (targetCanvas.width - mw) / 2;
  const oy = (targetCanvas.height - mh) / 2;
  matrix.forEach((row, y) => row.forEach((val, x) => {
    if (val) {
      targetCtx.fillStyle = colors[val];
      targetCtx.fillRect(ox + x * cell, oy + y * cell, cell - 1, cell - 1);
    }
  }));
}

function drawNextPiece() { drawMini(nextCtx, nextCanvas, player.next); }
function drawHoldPiece() { drawMini(holdCtx, holdCanvas, holdMatrix); }

function spawnParticles(rowY, count) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * 12,
      y: rowY + Math.random(),
      vx: (Math.random() - 0.5) * 0.3,
      vy: -Math.random() * 0.25 - 0.05,
      life: 1,
      color: colors[1 + (Math.random() * 7 | 0)]
    });
  }
}

function updateParticles(dt) {
  particles = particles.filter(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.01;
    p.life -= dt / 500;
    return p.life > 0;
  });
}

function drawParticles() {
  particles.forEach(p => {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, 0.25, 0.25);
  });
  ctx.globalAlpha = 1;
}

function draw() {
  // Always reset transform to block scale (fixes invisible pieces)
  ctx.setTransform(20, 0, 0, 20, 0, 0);

  // shake
  const boardWrap = document.getElementById('board-wrap');
  if (shakeTime > 0 && boardWrap) {
    const s = Math.min(shakeTime, 200) / 100;
    boardWrap.style.transform = `translate(${(Math.random()-0.5)*s*4}px, ${(Math.random()-0.5)*s*4}px)`;
  } else if (boardWrap) {
    boardWrap.style.transform = '';
  }

  // Background in pixel space
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  let bgDrawn = false;
  try {
    if (active.theme && mellBG.complete && mellBG.naturalWidth) {
      ctx.drawImage(mellBG, 0, 0, canvas.width, canvas.height);
      bgDrawn = true;
    } else {
      for (const t of themes.slice(1)) {
        if (active[t] && vids[t] && vids[t].readyState >= 2) {
          ctx.drawImage(vids[t], 0, 0, canvas.width, canvas.height);
          bgDrawn = true;
          break;
        }
      }
    }
  } catch (e) { /* ignore media draw errors */ }
  if (!bgDrawn) {
    ctx.fillStyle = '#0c0c18';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Back to block coordinates
  ctx.setTransform(20, 0, 0, 20, 0, 0);

  // grid
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 0.03;
  for (let x = 0; x <= 12; x++) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 20); ctx.stroke(); }
  for (let y = 0; y <= 20; y++) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(12, y); ctx.stroke(); }

  drawMatrix(arena, { x: 0, y: 0 });
  // line clear flash
  if (lineFlashTime > 0 && lineFlashRows.length) {
    ctx.globalAlpha = Math.min(1, lineFlashTime / 180) * 0.7;
    ctx.fillStyle = '#ffffff';
    lineFlashRows.forEach(y => ctx.fillRect(0, y, 12, 1));
    ctx.globalAlpha = 1;
  }
  if (settings.ghost && player.matrix && !gameOver) {
    const gy = getGhostY();
    if (gy >= 0) drawMatrix(player.matrix, { x: player.pos.x, y: gy }, 0.25);
  }
  if (player.matrix) drawMatrix(player.matrix, player.pos);
  drawParticles();
  drawNextPiece();
  drawHoldPiece();

  if (paused && !gameOver) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ПАУЗА', canvas.width / 2, canvas.height / 2);
    ctx.setTransform(20, 0, 0, 20, 0, 0);
  }
}

function arenaSweep() {
  let rowCount = 0;
  const clearedYs = [];
  outer: for (let y = arena.length - 1; y >= 0; --y) {
    for (let x = 0; x < arena[y].length; ++x) {
      if (arena[y][x] === 0) continue outer;
    }
    clearedYs.push(y);
    const row = arena.splice(y, 1)[0].fill(0);
    arena.unshift(row);
    rowCount++;
    y++;
  }

  if (rowCount > 0) {
    combo++;
    if (combo > stats.maxCombo) { stats.maxCombo = combo; saveStats(); }
    const pointsTable = [0, 100, 300, 500, 800];
    let gained = (pointsTable[rowCount] || 800) * level;
    if (combo > 1) gained += 50 * combo * level;
    // T-Spin bonus (checked before piece merges... we check on last rotate flag stored)
    if (window._pendingTSpin) {
      gained += 400 * level * rowCount;
      stats.tspins = (stats.tspins || 0) + 1;
      toast('T-SPIN! +' + (400 * level * rowCount));
      window._pendingTSpin = false;
      sfx('tetris');
    }
    score += gained;
    balance += gained;
    linesCleared += rowCount;
    stats.totalLines += rowCount;
    if (gameMode === 'hunger') stats.hungerLines = (stats.hungerLines || 0) + rowCount;
    questProgress('lines', rowCount);
    questProgress('score', gained);
    if (combo >= 3) questProgress('combo', combo);
    updateProfileUI();

    clearedYs.forEach(y => spawnParticles(y, 18));
    lineFlashRows = clearedYs.slice();
    lineFlashTime = 180;
    if (rowCount >= 4) {
      stats.tetrises = (stats.tetrises || 0) + 1;
      questProgress('tetris', 1);
      shakeTime = 250;
      sfx('tetris');
      vibrate(40);
      toast('TETRIS! +' + gained);
    } else {
      sfx('line');
      vibrate(15);
    }

    if (gameMode !== 'zen') {
      const newLevel = Math.floor(linesCleared / 10) + 1;
      if (newLevel > level) {
        level = newLevel;
        dropInterval = Math.max(80, 1000 - (level - 1) * 70);
        if (level > stats.maxLevel) { stats.maxLevel = level; saveStats(); }
        sfx('level');
        toast('Уровень ' + level);
      }
    }

    if (gameMode === 'sprint' && linesCleared >= sprintTarget) {
      finishSprint();
    }

    saveStats();
    checkAchievements();
    updateScore();
    updateBalance();
  } else {
    combo = 0;
    updateScore();
  }
}

function merge(arena, player) {
  player.matrix.forEach((row, y) =>
    row.forEach((val, x) => {
      if (val) arena[y + player.pos.y][x + player.pos.x] = val;
    })
  );
}

function randomPiece() {
  const pieces = 'TJLOSZI';
  return createPiece(pieces[(Math.random() * pieces.length) | 0]);
}

function playerReset() {
  player.matrix = player.next || randomPiece();
  player.next = randomPiece();
  player.pos.y = 0;
  player.pos.x = ((arena[0].length / 2) | 0) - ((player.matrix[0].length / 2) | 0);
  holdLocked = false;
  if (collide(arena, player)) {
    endGame(false);
  }
}

function playerDrop() {
  if (paused || gameOver) return;
  player.pos.y++;
  if (collide(arena, player)) {
    player.pos.y--;
    window._pendingTSpin = checkTSpin();
    merge(arena, player);
    arenaSweep();
    playerReset();
    sfx('drop');
  } else if (softDropping) {
    score += 1;
    updateScore();
  }
  dropCounter = 0;
}

function playerHardDrop() {
  if (paused || gameOver) return;
  let dist = 0;
  while (!collide(arena, player)) { player.pos.y++; dist++; }
  player.pos.y--;
  dist--;
  window._pendingTSpin = checkTSpin();
  merge(arena, player);
  arenaSweep();
  playerReset();
  dropCounter = 0;
  score += Math.max(0, dist) * 2;
  updateScore();
  sfx('drop');
  vibrate(10);
}

function playerMove(dir) {
  if (paused || gameOver) return;
  player.pos.x += dir;
  if (collide(arena, player)) player.pos.x -= dir;
  else sfx('move');
}

function playerRotate(dir) {
  if (paused || gameOver || !player.matrix) return;
  const pos = player.pos.x;
  const py = player.pos.y;
  rotate(player.matrix, dir);
  const kicks = [0, 1, -1, 2, -2];
  let ok = false;
  let usedKick = false;
  for (const k of kicks) {
    player.pos.x = pos + k;
    if (!collide(arena, player)) {
      ok = true;
      usedKick = k !== 0;
      break;
    }
  }
  if (!ok) {
    // try small vertical kicks
    for (const ky of [-1, 1]) {
      for (const k of [0, 1, -1]) {
        player.pos.x = pos + k;
        player.pos.y = py + ky;
        if (!collide(arena, player)) {
          ok = true; usedKick = true; break;
        }
      }
      if (ok) break;
    }
  }
  if (!ok) {
    rotate(player.matrix, -dir);
    player.pos.x = pos;
    player.pos.y = py;
    return;
  }
  lastRotateWasKick = usedKick;
  sfx('rotate');
}

function isTPiece(m) {
  if (!m || m.length < 2) return false;
  // T shape has 4 cells in T configuration
  let cells = 0;
  m.forEach(r => r.forEach(v => { if (v === 1) cells++; }));
  return cells === 4 || (m.some(r => r.includes(1)) && cells >= 3);
}

function checkTSpin() {
  if (!player.matrix) return false;
  // crude T-spin: last move was rotate and 3+ corners blocked around center
  let hasT = false;
  player.matrix.forEach(r => r.forEach(v => { if (v === 1) hasT = true; }));
  if (!hasT) return false;
  const cx = player.pos.x + 1, cy = player.pos.y + 1;
  const corners = [[cx-1,cy-1],[cx+1,cy-1],[cx-1,cy+1],[cx+1,cy+1]];
  let blocked = 0;
  corners.forEach(([x,y]) => {
    if (y < 0 || y >= arena.length || x < 0 || x >= arena[0].length || arena[y][x] !== 0) blocked++;
  });
  return blocked >= 3 && lastRotateWasKick;
}

function addGarbage(n) {
  for (let i = 0; i < n; i++) {
    const hole = (Math.random() * 12) | 0;
    const row = new Array(12).fill(8); // color 8 will map - need color
    // use color index 7 as garbage look
    for (let x = 0; x < 12; x++) row[x] = x === hole ? 0 : 7;
    arena.shift();
    arena.push(row);
  }
  // if player collides after garbage, push up or end
  if (player.matrix && collide(arena, player)) {
    player.pos.y--;
    if (collide(arena, player)) endGame(false);
  }
}

function playerHold() {
  if (paused || gameOver || holdLocked) return;
  const current = player.matrix;
  if (holdMatrix) {
    player.matrix = holdMatrix;
    holdMatrix = current;
  } else {
    holdMatrix = current;
    player.matrix = player.next;
    player.next = randomPiece();
  }
  player.pos.y = 0;
  player.pos.x = ((arena[0].length / 2) | 0) - ((player.matrix[0].length / 2) | 0);
  if (collide(arena, player)) {
    // undo is hard — just end if impossible
    endGame(false);
    return;
  }
  holdLocked = true;
  drawHoldPiece();
  sfx('hold');
}

function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return m + ':' + String(ss).padStart(2, '0');
}


// ===================== DUEL =====================
function stopDuel() {
  if (duelUnsub) { try { duelUnsub(); } catch(e) {} duelUnsub = null; }
  if (duelId) {
    try {
      if (typeof firebase !== 'undefined') {
        firebase.database().ref('/duels/' + duelId).off();
        // leave room after short delay so opponent sees final score
      }
    } catch(e) {}
  }
  duelId = null;
  duelOppScore = 0;
  const dc = document.getElementById('duel-card');
  if (dc) dc.style.display = 'none';
}

function startDuelMatchmaking() {
  if (typeof firebase === 'undefined') {
    toast('Дуэль недоступна офлайн');
    gameMode = 'classic';
    return false;
  }
  try {
    const db = firebase.database();
    const waiting = db.ref('/duelWaiting');
    // try join existing
    // Simplified: create unique duel id from two random players via push
    const myId = localStorage.getItem('tetrisDuelId') || Math.random().toString(36).slice(2);
    localStorage.setItem('tetrisDuelId', myId);
    const name = localStorage.getItem('tetrisName') || ('Игрок' + Math.floor(Math.random()*9000+1000));
    localStorage.setItem('tetrisName', name);

    // Look for open room
    waiting.once('value', snap => {
      let joined = false;
      snap.forEach(child => {
        if (joined) return;
        const v = child.val();
        if (v && v.status === 'waiting' && v.host !== myId) {
          joined = true;
          duelId = child.key;
          child.ref.update({ status: 'active', guest: myId, guestName: name, guestScore: 0 });
          toast('⚔️ Соперник найден!');
          listenDuel();
        }
      });
      if (!joined) {
        const ref = waiting.push({
          host: myId, hostName: name, hostScore: 0, guestScore: 0,
          status: 'waiting', ts: Date.now()
        });
        duelId = ref.key;
        toast('⚔️ Поиск соперника...');
        // wait for guest
        ref.on('value', s => {
          const v = s.val();
          if (!v) return;
          if (v.status === 'active') {
            toast('⚔️ Соперник подключился!');
            listenDuel();
          }
        });
        // timeout 20s -> solo practice vs ghost target
        setTimeout(() => {
          if (gameMode === 'duel' && duelOppScore === 0) {
            toast('Играем против цели 3000');
          }
        }, 20000);
      }
    });
    return true;
  } catch(e) {
    toast('Дуэль: ошибка сети');
    return false;
  }
}

function listenDuel() {
  if (!duelId || typeof firebase === 'undefined') return;
  const ref = firebase.database().ref('/duelWaiting/' + duelId);
  const handler = s => {
    const v = s.val();
    if (!v) return;
    const myId = (currentUser && currentUser.uid) || localStorage.getItem('tetrisDuelId');
    if (v.host === myId) {
      duelOppScore = v.guestScore || 0;
    } else {
      duelOppScore = v.hostScore || 0;
    }
    const el = document.getElementById('duel-opp');
    if (el) el.textContent = duelOppScore;
    // win/lose check
    if ((duelOppScore >= 3000 && score < 3000) || (score >= 3000 && duelOppScore < 3000)) {
      if (!gameOver) {
        endGame(score >= 3000);
        if (score < 3000) toast('Поражение в дуэли');
      }
    }
  };
  ref.on('value', handler);
  duelUnsub = () => ref.off('value', handler);
}

function publishDuelScore() {
  if (gameMode !== 'duel' || !duelId || typeof firebase === 'undefined') return;
  try {
    const myId = (currentUser && currentUser.uid) || localStorage.getItem('tetrisDuelId');
    // Try new rooms path first, fallback to waiting
    const tryUpdate = (path) => {
      const ref = firebase.database().ref(path + duelId);
      return ref.once('value').then(s => {
        const v = s.val();
        if (!v) return false;
        if (v.host === myId) { ref.update({ hostScore: score }); return true; }
        if (v.guest === myId) { ref.update({ guestScore: score }); return true; }
        return false;
      });
    };
    tryUpdate('/duels/').then(ok => {
      if (!ok) tryUpdate('/duelWaiting/');
    });
  } catch(e) {}
}

function startGame() {
  arena.forEach(r => r.fill(0));
  score = 0; level = 1; linesCleared = 0; combo = 0;
  dropInterval = gameMode === 'zen' ? 1200 : 1000;
  gameOver = false; paused = false;
  holdMatrix = null; holdLocked = false;
  particles = []; shakeTime = 0;
  hungerTimer = 0; hungerInterval = 12000;
  lastRotateWasKick = false;
  lineFlashRows = []; lineFlashTime = 0;
  // Only clear duel if we are not already in a challenged room
  const keepDuelId = (gameMode === 'duel' && duelId);
  if (!keepDuelId) stopDuel();
  player.next = randomPiece();
  player.matrix = null;
  playerReset();
  if (!player.matrix) {
    player.matrix = randomPiece();
    player.pos = { x: 4, y: 0 };
  }
  updateScore();
  const tc = document.getElementById('timer-card');
  const dc = document.getElementById('duel-card');
  if (gameMode === 'sprint') {
    sprintStart = performance.now();
    sprintElapsed = 0;
    if (tc) tc.style.display = '';
  } else {
    if (tc) tc.style.display = 'none';
  }
  if (gameMode === 'duel') {
    if (dc) dc.style.display = '';
    const el = document.getElementById('duel-opp');
    if (el) el.textContent = keepDuelId ? String(duelOppScore || 0) : '0';
    if (!keepDuelId) {
      startDuelMatchmaking();
    } else {
      // already have room from challenge — just listen
      if (typeof listenDuelRoom === 'function') listenDuelRoom();
      else listenDuel();
    }
  } else {
    if (dc) dc.style.display = 'none';
  }
  questProgress('games', 1);
}

function endGame(won) {
  gameOver = true;
  paused = true;
  publishDuelScore();
  sfx('gameover');
  if (score > stats.bestScore) { stats.bestScore = score; saveStats(); }
  checkAchievements();
  if (won && gameMode === 'duel') {
    stats.duelWins = (stats.duelWins || 0) + 1;
    saveStats();
    checkAchievements();
  }
  document.getElementById('go-title').textContent =
    won ? (gameMode === 'duel' ? 'ПОБЕДА В ДУЭЛИ!' : gameMode === 'sprint' ? 'СПРИНТ ПРОЙДЕН!' : 'ПОБЕДА!') : 'GAME OVER';
  document.getElementById('go-score').textContent = score;
  document.getElementById('go-lines').textContent = linesCleared;
  document.getElementById('go-level').textContent = level;
  const tr = document.getElementById('go-time-row');
  if (gameMode === 'sprint') {
    tr.style.display = '';
    document.getElementById('go-time').textContent = formatTime(sprintElapsed);
  } else tr.style.display = 'none';
  submitScore(score);
  showScreen(goScreen);
}

function finishSprint() {
  sprintElapsed = performance.now() - sprintStart;
  stats.sprints = (stats.sprints || 0) + 1;
  saveStats();
  checkAchievements();
  endGame(true);
  toast('Спринт: ' + formatTime(sprintElapsed));
}

document.getElementById('go-retry')?.addEventListener('click', () => {
  startGame();
  showScreen(gameDiv);
});
document.getElementById('go-menu')?.addEventListener('click', () => {
  showScreen(modeScreen);
});
document.getElementById('go-share')?.addEventListener('click', async () => {
  const text = `Tetris · ${score} очков · ${linesCleared} линий · ур.${level}` +
    (gameMode === 'sprint' ? ` · ${formatTime(sprintElapsed)}` : '');
  try {
    if (navigator.share) await navigator.share({ text });
    else {
      await navigator.clipboard.writeText(text);
      toast('Скопировано!');
    }
  } catch(e) {
    try { await navigator.clipboard.writeText(text); toast('Скопировано!'); } catch(e2) {}
  }
});

// ===================== LOOP =====================
function update(time = 0) {
  const delta = time - lastTime;
  lastTime = time;

  if (!paused && !gameOver && player.matrix) {
    dropCounter += delta;
    if (dropCounter > dropInterval) playerDrop();
    if (gameMode === 'sprint' && sprintStart) {
      sprintElapsed = performance.now() - sprintStart;
      const tv = document.getElementById('timer-val');
      if (tv) tv.textContent = formatTime(sprintElapsed);
    }
    if (gameMode === 'hunger') {
      hungerTimer += delta;
      if (hungerTimer >= hungerInterval) {
        hungerTimer = 0;
        addGarbage(1);
        // speed up garbage over time
        hungerInterval = Math.max(4000, hungerInterval - 200);
        sfx('drop');
      }
    }
  }
  if (shakeTime > 0) shakeTime -= delta;
  if (lineFlashTime > 0) lineFlashTime -= delta;
  updateParticles(delta);
  draw();
  requestAnimationFrame(update);
}

// ===================== CONTROLS =====================
['left','right','down','rotate'].forEach(id => {
  const btn = document.getElementById(id);
  if (!btn) return;
  let iv, delayT;
  const action = () => {
    if (id === 'left') playerMove(-1);
    if (id === 'right') playerMove(1);
    if (id === 'down') { softDropping = true; playerDrop(); }
    if (id === 'rotate') playerRotate(1);
  };
  const startRepeat = () => {
    action();
    clearTimeout(delayT); clearInterval(iv);
    delayT = setTimeout(() => {
      iv = setInterval(action, settings.arr || 70);
    }, settings.das || 250);
  };
  const stopRepeat = () => {
    clearTimeout(delayT); clearInterval(iv); softDropping = false;
  };
  btn.addEventListener('mousedown', startRepeat);
  btn.addEventListener('mouseup', stopRepeat);
  btn.addEventListener('mouseleave', stopRepeat);
  btn.addEventListener('touchstart', e => { e.preventDefault(); startRepeat(); }, { passive: false });
  btn.addEventListener('touchend', e => { e.preventDefault(); stopRepeat(); }, { passive: false });
});

document.getElementById('hard-drop')?.addEventListener('click', () => playerHardDrop());
document.getElementById('hold-btn')?.addEventListener('click', () => playerHold());
document.getElementById('pause-btn')?.addEventListener('click', () => {
  if (!gameOver && gameDiv.style.display !== 'none') paused = !paused;
});

document.addEventListener('keydown', e => {
  if (['ArrowLeft','ArrowRight','ArrowDown','ArrowUp',' '].includes(e.key)) e.preventDefault();
  if (e.key === 'ArrowLeft') playerMove(-1);
  if (e.key === 'ArrowRight') playerMove(1);
  if (e.key === 'ArrowDown') { softDropping = true; playerDrop(); }
  if (e.key === 'ArrowUp') playerRotate(1);
  if (e.key === ' ' || e.code === 'Space') playerHardDrop();
  if (e.key === 'c' || e.key === 'C' || e.key === 'с' || e.key === 'С') playerHold();
  if (e.key === 'p' || e.key === 'P' || e.key === 'з' || e.key === 'З') {
    if (!gameOver && gameDiv.classList.contains('active-screen') || gameDiv.style.display === 'flex')
      paused = !paused;
  }
  if (e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К') {
    if (gameOver) { startGame(); showScreen(gameDiv); }
  }
});
document.addEventListener('keyup', e => {
  if (e.key === 'ArrowDown') softDropping = false;
});

// Swipes
(function() {
  const el = canvas;
  let sx = 0, sy = 0, st = 0;
  el.addEventListener('touchstart', e => {
    if (e.touches.length !== 1) return;
    sx = e.touches[0].clientX; sy = e.touches[0].clientY; st = Date.now();
  }, { passive: true });
  el.addEventListener('touchend', e => {
    const t = e.changedTouches[0];
    const dx = t.clientX - sx, dy = t.clientY - sy;
    const dt = Date.now() - st;
    const absX = Math.abs(dx), absY = Math.abs(dy);
    if (dt > 500) return;
    if (absX < 20 && absY < 20) { playerRotate(1); return; }
    if (absX > absY) {
      if (dx > 30) playerMove(1);
      else if (dx < -30) playerMove(-1);
    } else {
      if (dy > 40) playerHardDrop();
      else if (dy < -40) playerHold();
    }
  }, { passive: true });
})();

// ===================== AUTH + ONLINE + DUEL SEARCH =====================
let currentUser = null; // { uid, name }
let presenceRef = null;
let onlineListener = null;
let challengeListener = null;
let db = null;
let firebaseReady = false;

const firebaseConfig = {
  apiKey: "AIzaSyB1N9wwPZh1vQkIt-V7by8FW-7xoZobsDg",
  authDomain: "tetris2-71bfa.firebaseapp.com",
  databaseURL: "https://tetris2-71bfa-default-rtdb.firebaseio.com",
  projectId: "tetris2-71bfa",
  storageBucket: "tetris2-71bfa.appspot.com",
  messagingSenderId: "38355194193",
  appId: "1:38355194193:web:93229f575c86111a8f7af0"
};

function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return 'h' + Math.abs(h).toString(36) + btoa(unescape(encodeURIComponent(str))).slice(0, 12);
}

function updateOnlineCounts(n) {
  ['online-count', 'online-count-mode', 'online-count-auth', 'online-count-lobby'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = n;
  });
}

function setPresence(status) {
  if (!presenceRef || !currentUser) return;
  presenceRef.set({
    name: currentUser.name,
    uid: currentUser.uid,
    status: status || 'menu',
    ts: Date.now()
  }).catch(() => {});
}

function clearPresence() {
  if (presenceRef) {
    try { presenceRef.onDisconnect().cancel(); presenceRef.remove(); } catch(e) {}
    presenceRef = null;
  }
}

function startPresence() {
  if (!db || !currentUser) return;
  clearPresence();
  presenceRef = db.ref('/online/' + currentUser.uid);
  setPresence('menu');
  presenceRef.onDisconnect().remove();
  // heartbeat
  if (window._presenceHeartbeat) clearInterval(window._presenceHeartbeat);
  window._presenceHeartbeat = setInterval(() => setPresence(currentUser ? (document.getElementById('duel-lobby-screen')?.classList.contains('active-screen') ? 'searching' : 'menu') : 'menu'), 25000);
}

function listenOnline() {
  if (!db) return;
  if (onlineListener) try { db.ref('/online').off('value', onlineListener); } catch(e) {}
  onlineListener = db.ref('/online').on('value', snap => {
    const n = snap.numChildren();
    updateOnlineCounts(n);
    // refresh lobby list if open
    if (document.getElementById('duel-lobby-screen')?.classList.contains('active-screen')) {
      renderPlayersList(snap.val() || {});
    }
  }, err => {
    console.warn('online listen', err);
    updateOnlineCounts('?');
  });
}

function listenChallenges() {
  if (!db || !currentUser) return;
  if (challengeListener) try { db.ref('/challenges/' + currentUser.uid).off(); } catch(e) {}
  challengeListener = db.ref('/challenges/' + currentUser.uid).on('value', snap => {
    const v = snap.val();
    if (!v || v.status !== 'pending') return;
    // show modal
    const modal = document.getElementById('challenge-modal');
    const title = document.getElementById('challenge-title');
    const text = document.getElementById('challenge-text');
    if (!modal) return;
    title.textContent = 'Вызов на дуэль!';
    text.textContent = (v.fromName || 'Игрок') + ' вызывает тебя на 1vs1';
    modal.style.display = 'flex';
    modal.dataset.fromUid = v.fromUid;
    modal.dataset.fromName = v.fromName || 'Игрок';
  });
}

function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  if (el) el.textContent = msg || '';
}

function afterLogin() {
  document.getElementById('current-user-name').textContent = currentUser.name;
  localStorage.setItem('tetrisUser', JSON.stringify(currentUser));
  startPresence();
  listenChallenges();
  showScreen(modeScreen);
  toast('Привет, ' + currentUser.name + '!');
}

async function doRegister() {
  const nick = (document.getElementById('auth-nick')?.value || '').trim();
  const pass = document.getElementById('auth-pass')?.value || '';
  showAuthError('');
  if (nick.length < 3) return showAuthError('Ник минимум 3 символа');
  if (pass.length < 4) return showAuthError('Пароль минимум 4 символа');
  if (!/^[a-zA-Zа-яА-ЯёЁ0-9_]+$/.test(nick)) return showAuthError('Только буквы, цифры и _');
  if (!db) return showAuthError('Нет соединения с сервером');

  const key = nick.toLowerCase();
  try {
    const snap = await db.ref('/users/' + key).once('value');
    if (snap.exists()) return showAuthError('Такой ник уже занят');
    const uid = 'u_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    const hash = simpleHash(pass + key);
    await db.ref('/users/' + key).set({
      name: nick,
      pass: hash,
      uid,
      created: Date.now()
    });
    currentUser = { uid, name: nick };
    afterLogin();
  } catch (e) {
    console.warn(e);
    showAuthError('Ошибка регистрации');
  }
}

async function doLogin() {
  const nick = (document.getElementById('auth-nick')?.value || '').trim();
  const pass = document.getElementById('auth-pass')?.value || '';
  showAuthError('');
  if (!nick || !pass) return showAuthError('Введи ник и пароль');
  if (!db) return showAuthError('Нет соединения с сервером');

  const key = nick.toLowerCase();
  try {
    const snap = await db.ref('/users/' + key).once('value');
    if (!snap.exists()) return showAuthError('Пользователь не найден');
    const data = snap.val();
    if (data.pass !== simpleHash(pass + key)) return showAuthError('Неверный пароль');
    currentUser = { uid: data.uid, name: data.name || nick };
    afterLogin();
  } catch (e) {
    console.warn(e);
    showAuthError('Ошибка входа');
  }
}

function doGuest() {
  const guestName = 'Гость' + Math.floor(Math.random() * 9000 + 1000);
  const uid = 'g_' + Math.random().toString(36).slice(2);
  currentUser = { uid, name: guestName };
  afterLogin();
}

function doLogout() {
  clearPresence();
  if (challengeListener && db && currentUser) {
    try { db.ref('/challenges/' + currentUser.uid).off(); } catch(e) {}
  }
  currentUser = null;
  localStorage.removeItem('tetrisUser');
  document.getElementById('current-user-name').textContent = 'Гость';
  showScreen(document.getElementById('auth-screen'));
  toast('Вы вышли');
}

// ---------- Duel Lobby ----------
function openDuelLobby() {
  showScreen(document.getElementById('duel-lobby-screen'));
  setPresence('searching');
  if (db) {
    db.ref('/online').once('value').then(snap => renderPlayersList(snap.val() || {}));
  }
}

function renderPlayersList(onlineMap) {
  const list = document.getElementById('players-list');
  const empty = document.getElementById('players-empty');
  if (!list) return;
  const search = (document.getElementById('player-search')?.value || '').toLowerCase().trim();
  const rows = [];
  Object.keys(onlineMap || {}).forEach(uid => {
    if (currentUser && uid === currentUser.uid) return;
    const p = onlineMap[uid];
    if (!p || !p.name) return;
    if (search && !p.name.toLowerCase().includes(search)) return;
    rows.push({ uid, name: p.name, status: p.status || 'menu', ts: p.ts || 0 });
  });
  rows.sort((a, b) => a.name.localeCompare(b.name));
  if (!rows.length) {
    list.innerHTML = '';
    if (empty) empty.style.display = '';
    return;
  }
  if (empty) empty.style.display = 'none';
  list.innerHTML = rows.map(p => `
    <div class="player-row" data-uid="${p.uid}">
      <div>
        <div class="pname">${escapeHtml(p.name)}</div>
        <div class="pstatus">${p.status === 'searching' ? '🔍 Ищет игру' : p.status === 'playing' ? '🎮 В игре' : '🟢 В меню'}</div>
      </div>
      <button class="challenge-btn" data-uid="${p.uid}" data-name="${escapeHtml(p.name)}" ${p.status === 'playing' ? 'disabled' : ''}>Вызвать</button>
    </div>
  `).join('');
}

function escapeHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function sendChallenge(toUid, toName) {
  if (!db || !currentUser) return;
  const ref = db.ref('/challenges/' + toUid);
  ref.set({
    fromUid: currentUser.uid,
    fromName: currentUser.name,
    status: 'pending',
    ts: Date.now()
  });
  // auto expire
  setTimeout(() => {
    ref.once('value').then(s => {
      if (s.val() && s.val().status === 'pending') ref.remove();
    });
  }, 30000);
  toast('Вызов отправлен: ' + toName);
}

function acceptChallenge(fromUid, fromName) {
  if (!db || !currentUser) return;
  // create duel room
  const roomRef = db.ref('/duels').push({
    host: fromUid,
    hostName: fromName,
    guest: currentUser.uid,
    guestName: currentUser.name,
    hostScore: 0,
    guestScore: 0,
    status: 'active',
    ts: Date.now()
  });
  duelId = roomRef.key;
  // clear challenge
  db.ref('/challenges/' + currentUser.uid).remove();
  document.getElementById('challenge-modal').style.display = 'none';
  // notify host by writing accepted flag (host listens via old waiting or we use this room)
  db.ref('/challenges/' + fromUid).set({
    status: 'accepted',
    duelId: duelId,
    fromUid: currentUser.uid,
    fromName: currentUser.name,
    ts: Date.now()
  });
  toast('⚔️ Дуэль началась!');
  gameMode = 'duel';
  setPresence('playing');
  ensureAudio();
  // duelId already set — startGame will keep it and call listenDuelRoom
  startGame();
  showScreen(gameDiv);
  paused = false;
  gameOver = false;
  lastTime = performance.now();
  dropCounter = 0;
}

function listenDuelRoom() {
  if (!duelId || !db) return;
  const ref = db.ref('/duels/' + duelId);
  if (duelUnsub) try { duelUnsub(); } catch(e) {}
  duelUnsub = ref.on('value', s => {
    const v = s.val();
    if (!v) return;
    const myId = currentUser?.uid;
    if (v.host === myId) duelOppScore = v.guestScore || 0;
    else duelOppScore = v.hostScore || 0;
    const el = document.getElementById('duel-opp');
    if (el) el.textContent = duelOppScore;
    // win check
    if (v.hostScore >= 3000 || v.guestScore >= 3000) {
      const iWon = (v.host === myId && v.hostScore >= 3000) || (v.guest === myId && v.guestScore >= 3000);
      if (!gameOver) endGame(iWon);
    }
  });
}

// Override publish to use new room path
const _oldPublish = typeof publishDuelScore === 'function' ? publishDuelScore : null;
function publishDuelScore() {
  if (!duelId || !db || !currentUser) return;
  try {
    const ref = db.ref('/duels/' + duelId);
    ref.once('value').then(s => {
      const v = s.val();
      if (!v) return;
      if (v.host === currentUser.uid) ref.update({ hostScore: score });
      else if (v.guest === currentUser.uid) ref.update({ guestScore: score });
    });
  } catch(e) {}
}

// Quick match still uses old waiting logic, but improved
function startDuelMatchmaking() {
  if (!db || !currentUser) {
    toast('Дуэль недоступна');
    gameMode = 'classic';
    return false;
  }
  try {
    const waiting = db.ref('/duelWaiting');
    const myId = currentUser.uid;
    const name = currentUser.name;

    waiting.once('value', snap => {
      let joined = false;
      snap.forEach(child => {
        if (joined) return;
        const v = child.val();
        if (v && v.status === 'waiting' && v.host !== myId) {
          joined = true;
          duelId = child.key;
          child.ref.update({ status: 'active', guest: myId, guestName: name, guestScore: 0 });
          toast('⚔️ Соперник найден!');
          listenDuel(); // old path still works for waiting rooms
        }
      });
      if (!joined) {
        const ref = waiting.push({
          host: myId, hostName: name, hostScore: 0, guestScore: 0,
          status: 'waiting', ts: Date.now()
        });
        duelId = ref.key;
        toast('⚔️ Поиск соперника...');
        ref.on('value', s => {
          const v = s.val();
          if (!v) return;
          if (v.status === 'active') {
            toast('⚔️ Соперник подключился!');
            listenDuel();
          }
        });
        setTimeout(() => {
          if (gameMode === 'duel' && duelOppScore === 0 && !gameOver) {
            toast('Играем против цели 3000');
          }
        }, 20000);
      }
    });
    return true;
  } catch(e) {
    toast('Дуэль: ошибка сети');
    return false;
  }
}

// Bind UI
document.getElementById('auth-login')?.addEventListener('click', doLogin);
document.getElementById('auth-register')?.addEventListener('click', doRegister);
document.getElementById('auth-guest')?.addEventListener('click', doGuest);
document.getElementById('logout-btn')?.addEventListener('click', doLogout);
document.getElementById('auth-pass')?.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
document.getElementById('auth-nick')?.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

document.getElementById('duel-lobby-back')?.addEventListener('click', () => {
  setPresence('menu');
  showScreen(modeScreen);
});
document.getElementById('duel-quick')?.addEventListener('click', () => {
  gameMode = 'duel';
  setPresence('playing');
  ensureAudio();
  try { startGame(); } catch(e) { console.error(e); }
  showScreen(gameDiv);
  paused = false; gameOver = false;
  lastTime = performance.now(); dropCounter = 0;
});
document.getElementById('player-search')?.addEventListener('input', () => {
  if (db) db.ref('/online').once('value').then(s => renderPlayersList(s.val() || {}));
});
document.getElementById('players-list')?.addEventListener('click', e => {
  const btn = e.target.closest('.challenge-btn');
  if (!btn || btn.disabled) return;
  sendChallenge(btn.dataset.uid, btn.dataset.name);
});

document.getElementById('challenge-accept')?.addEventListener('click', () => {
  const modal = document.getElementById('challenge-modal');
  acceptChallenge(modal.dataset.fromUid, modal.dataset.fromName);
});
document.getElementById('challenge-decline')?.addEventListener('click', () => {
  if (db && currentUser) db.ref('/challenges/' + currentUser.uid).remove();
  document.getElementById('challenge-modal').style.display = 'none';
});

// Also listen for accepted challenges (when we are the challenger)
function listenMyChallengeResponses() {
  if (!db || !currentUser) return;
  db.ref('/challenges/' + currentUser.uid).on('value', snap => {
    const v = snap.val();
    if (v && v.status === 'accepted' && v.duelId) {
      duelId = v.duelId;
      db.ref('/challenges/' + currentUser.uid).remove();
      toast('⚔️ Соперник принял вызов!');
      gameMode = 'duel';
      setPresence('playing');
      ensureAudio();
      startGame();
      listenDuelRoom();
      showScreen(gameDiv);
      paused = false; gameOver = false;
      lastTime = performance.now(); dropCounter = 0;
    }
  });
}

// ===================== INIT =====================
updateScore();
updateBalance();
updateCaseTimer();
setupThemeOfDay();
bindSettings();
updateProfileUI();
update();

// Firebase init
try {
  if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
    firebaseReady = true;
    listenOnline();

    // restore session
    const saved = localStorage.getItem('tetrisUser');
    if (saved) {
      try {
        currentUser = JSON.parse(saved);
        if (currentUser && currentUser.uid && currentUser.name) {
          document.getElementById('current-user-name').textContent = currentUser.name;
          startPresence();
          listenChallenges();
          listenMyChallengeResponses();
          showScreen(modeScreen);
        } else {
          showScreen(document.getElementById('auth-screen'));
        }
      } catch(e) {
        showScreen(document.getElementById('auth-screen'));
      }
    } else {
      showScreen(document.getElementById('auth-screen'));
    }
  } else {
    console.warn('Firebase SDK missing');
    showScreen(document.getElementById('auth-screen'));
  }
} catch (e) {
  console.warn('Firebase', e);
  showScreen(document.getElementById('auth-screen'));
}
