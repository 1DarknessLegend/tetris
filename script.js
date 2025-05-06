// === Инициализация канваса и контекста ===
const canvas = document.getElementById('tetris');
const ctx    = canvas.getContext('2d');
ctx.scale(20, 20);
ctx.imageSmoothingEnabled = false;

// === Глобальные переменные для очков, баланса и интервалов ===
let score        = 0;
let balance      = 0;
let dropInterval = 1000;
let lastTime     = 0;
let dropCounter  = 0;

// === Список всех тем и их состояния ===
const themes = [
  'theme','chipmunk','glent','billy','pidors','bosinn','billyv2','edit',
  'gigachad','maga','sneakedup','goblingang','sexibetmen','sigma',
  'ricardomillos','trollface','kobyakov','chipichapa','whatsapp','rickroll','billyv3',"repo",'dance','dante','josh','repov2','tvorog','chicken','billyv4','music','crocodile','dantev2','rooster','goose','musicv2','romapro','creeper','roosterv2','toilet','ratdance','kingvon','musicv3','breto','roosterv3','mactraher','legday','laser','dragon','trollfacev2','endoskeleton'
];
const bought = {};
const active = {};

// === Кнопки ВКЛ/ВЫКЛ тем ===
themes.forEach(t => { bought[t] = false; active[t] = false; });

// === Получение DOM-элементов интерфейса ===
const scoreEl   = document.getElementById('score');
const balanceEl = document.getElementById('balance');
const gameDiv   = document.getElementById('game');
const shopDiv   = document.getElementById('shop-screen');
const easterDiv = document.getElementById('easter-screen');

const searchInput = document.getElementById('search');
const shopItems   = document.querySelectorAll('.shop-item');

// === Поиск по темам в магазине ===
searchInput.style.width = '100%';
searchInput.addEventListener('input', function() {
  const q = this.value.toLowerCase();
  shopItems.forEach(item => {
    item.style.display = item.innerText.toLowerCase().includes(q) ? '' : 'none';
  });
});

// === Загрузка музыки и видео по темам ===
const mellMusic = document.getElementById('mell-music');
const vids = {};
themes.slice(1).forEach(t => {
  const el = document.getElementById(`${t}-video`);
  if (el) { vids[t] = el; el.load(); }
});

// === Фоновое изображение для стандартной темы ===
const mellBG = new Image();
mellBG.src = 'https://avatars.mds.yandex.net/i?id=f929b30edd21b71bed35148895c13bd3_l-4531164-images-thumbs&n=13';

// === Функции обновления очков и баланса ===
function updateScore()   { scoreEl.textContent   = 'Очки: ' + score; }

function updateBalance() { balanceEl.textContent = 'Баланс: ' + balance; }

// === Покупка тем с симуляцией загрузки ===
themes.forEach(function(t) {
  var buyBtn = document.getElementById("buy-" + t);
  var actionsDiv = document.getElementById(t + "-actions");
  if (!buyBtn || !actionsDiv) return;

  buyBtn.addEventListener("click", async function() {
    
    if (!bought[t] && balance >= 200) {
      
      balance -= 200;
      bought[t] = true;
      updateBalance();

      buyBtn.disabled = true;
      buyBtn.textContent = "Загрузка: 0%";

      var mediaUrl;
      if (t === "theme") {
        mediaUrl = mellMusic.src;
      } else {
        var videoElem = document.getElementById(t + "-video");
        mediaUrl = videoElem ? videoElem.src : "";
      }

      try {
        var response = await fetch(mediaUrl);
        var total = parseInt(response.headers.get("Content-Length") || "0", 10);
        var reader = response.body.getReader();
        var received = 0;
        var chunks = [];

        while (true) {
          var result = await reader.read();
          if (result.done) break;
          chunks.push(result.value);
          received += result.value.length;
          var percent = total ? Math.floor((received / total) * 100) : 0;
          buyBtn.textContent = "Загрузка: " + percent + "%";
        }

        var blob = new Blob(chunks);
        var objectUrl = URL.createObjectURL(blob);
        if (t === "theme") {
          mellMusic.src = objectUrl;
        } else {
          var video = document.getElementById(t + "-video");
          if (video) video.src = objectUrl;
        }

        buyBtn.style.display = "none";
        actionsDiv.style.display = "flex";

      } catch (err) {
        console.error(err);
        
        balance += 200;
        bought[t] = false;
        updateBalance();
        
        buyBtn.disabled = false;
        buyBtn.textContent = "Ошибка загрузки";
      }

    } else if (!bought[t]) {
      
      alert("Недостаточно очков для покупки темы " + t);
    }
  });
});

// === Кнопки ВКЛ/ВЫКЛ тем ===
themes.forEach(t => {
  const applyBtn  = document.getElementById(`apply-${t}`);
  const removeBtn = document.getElementById(`remove-${t}`);
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      themes.forEach(x => active[x] = false);
      active[t] = true;
      mellMusic.pause(); mellMusic.currentTime = 0;
      Object.values(vids).forEach(v => { v.pause(); v.currentTime = 0; });
      if (t === 'theme') mellMusic.play().catch(() => {});
      else if (vids[t]) vids[t].play().catch(() => {});
    });
  }
  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      active[t] = false;
      if (t === 'theme') { mellMusic.pause(); mellMusic.currentTime = 0; }
      else if (vids[t]) { vids[t].pause(); vids[t].currentTime = 0; }
    });
  }
});

// === Переходы между экранами (магазин, игра, пасхалка) ===
document.getElementById('shop').addEventListener('click', () => {
  shopDiv.style.display = 'flex';
  gameDiv.style.display = 'none';
});
document.getElementById('return-shop').addEventListener('click', () => {
  shopDiv.style.display = 'none';
  gameDiv.style.display = 'block';
});

document.getElementById('easter-egg').addEventListener('click', () => {
  easterDiv.style.display = 'block';
  gameDiv.style.display   = 'none';
});
document.getElementById('return').addEventListener('click', () => {
  easterDiv.style.display = 'none';
  gameDiv.style.display   = 'block';
});

// === Пасхальное меню ===
const secretBtn = document.getElementById('secret-btn');
const secretMenu = document.createElement('div');
secretMenu.id = 'secret-menu';
Object.assign(secretMenu.style, {
  position: 'fixed',
  top: 0, left: 0,
  width: '100%', height: '100vh',
  background: 'rgba(0,0,0,0.9)',
  display: 'none',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000
});
const secretImg = document.createElement('img');
secretImg.src = 'secret.png';
secretImg.style.maxWidth = '80%';
secretImg.style.maxHeight = '80%';
const closeSecret = document.createElement('button');
closeSecret.textContent = 'Закрыть';
Object.assign(closeSecret.style, {
  marginTop: '20px',
  padding: '10px 20px',
  fontSize: '18px',
  borderRadius: '8px',
  border: 'none',
  cursor: 'pointer'
});
secretMenu.append(secretImg, closeSecret);
document.body.appendChild(secretMenu);
secretBtn.addEventListener('click', () => {
  secretMenu.style.display = 'flex';
});
closeSecret.addEventListener('click', () => {
  secretMenu.style.display = 'none';
});

// === Интерфейс открытия кейса ===
const caseBtn       = document.getElementById('case-btn');
const caseScreen    = document.getElementById('case-screen');
const returnCaseBtn = document.getElementById('return-case');
const timerEl       = document.getElementById('timer');
const openCaseBtn   = document.getElementById('open-case');
let caseAvailableAt = Date.now() + 5 * 60 * 1000;
const rewards       = [200, 400, 600, 800, 1000, 1200, 1400, 1600, 1800, 2000]

caseBtn.addEventListener('click', () => {
  updateCaseTimer();
  caseScreen.style.display = 'flex';
  gameDiv.style.display    = 'none';
});
returnCaseBtn.addEventListener('click', () => {
  caseScreen.style.display = 'none';
  gameDiv.style.display    = 'block';
});

// === Таймер до следующего кейса ===
function updateCaseTimer() {
  const diff = caseAvailableAt - Date.now();
  if (diff <= 0) {
    timerEl.textContent    = '00:00';
    openCaseBtn.disabled   = false;
  } else {
    const sec = Math.floor(diff/1000) % 60;
    const min = Math.floor(diff/60000);
    timerEl.textContent    = `${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
    openCaseBtn.disabled   = true;
    setTimeout(updateCaseTimer, 1000);
  }
}

openCaseBtn.addEventListener('click', () => {
  const scroll = document.getElementById('case-scroll');
  const indicator = document.getElementById('case-indicator');
  scroll.innerHTML = '';
  indicator.style.left = '50%';

  scroll.style.transition = 'none';
  scroll.style.transform = 'translateX(0)';

  setTimeout(() => {
    const pool = [];
    for (let i = 0; i < 50; i++) {
      const value = rewards[Math.floor(Math.random() * rewards.length)];
      const div = document.createElement('div');
      div.className = 'case-item';
      div.textContent = value + ' очков';
      pool.push(value);
      scroll.appendChild(div);
    }

    const stopIndex = 20 + Math.floor(Math.random() * 10);
    const scrollWrapper = document.getElementById('case-scroll-wrapper');
    const itemWidth = 110;
    const wrapperWidth = scrollWrapper.offsetWidth;
    const centerOffset = (stopIndex * itemWidth) - (wrapperWidth / 2) + (itemWidth / 2);

    scroll.style.transition = 'transform 5s cubic-bezier(0.15, 0.85, 0.35, 1)';
    scroll.style.transform = `translateX(${-centerOffset}px)`;
    openCaseBtn.disabled = true;

    const reward = pool[stopIndex];
    const handleTransitionEnd = () => {
      scroll.removeEventListener('transitionend', handleTransitionEnd);
      score += reward;
      balance += reward;
      updateScore();
      updateBalance();
      caseAvailableAt = Date.now() + 5 * 60 * 1000;
      updateCaseTimer();
      alert(`Вы получили ${reward} очков!`);
    };

    scroll.addEventListener('transitionend', handleTransitionEnd);
  }, 50);
});

// === Игровая логика: арена, игрок, фигуры ===
function createMatrix(w, h) {
  const matrix = [];
  while (h--) matrix.push(new Array(w).fill(0));
  return matrix;
}
const arena = createMatrix(12, 20);
const player = { pos:{x:0,y:0}, matrix: null };

// --- Проверка столкновений ---
function collide(arena, player) {
  const [m, o] = [player.matrix, player.pos];
  return m.some((row,y) =>
    row.some((val,x) => {
      if (!val) return false;
      const dy = y + o.y;
      const dx = x + o.x;
      return dy < 0 || dy >= arena.length ||
             dx < 0 || dx >= arena[0].length ||
             arena[dy][dx] !== 0;
    })
  );
}

// --- Создание фигур ---
function createPiece(type) {
  switch(type) {
    case 'T': return [[0,0,0],[1,1,1],[0,1,0]];
    case 'O': return [[2,2],[2,2]];
    case 'L': return [[0,3,0],[0,3,0],[0,3,3]];
    case 'J': return [[0,4,0],[0,4,0],[4,4,0]];
    case 'I': return [[0,5,0,0],[0,5,0,0],[0,5,0,0],[0,5,0,0]];
    case 'S': return [[0,6,6],[6,6,0],[0,0,0]];
    case 'Z': return [[7,7,0],[0,7,7],[0,0,0]];
  }
}

// --- Поворот фигуры ---
function rotate(matrix, dir) {
  for (let y=0; y<matrix.length; ++y) {
    for (let x=0; x<y; ++x) {
      [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
    }
  }
  dir > 0 ? matrix.forEach(r => r.reverse()) : matrix.reverse();
}

// --- Цвета фигур ---
const colors = [ null,'#FF0D72','#0DC2FF','#0DFF72','#F538FF','#FF8E0D','#FFE138','#3877FF' ];

// --- Отрисовка фигур ---
function drawMatrix(matrix, offset) {
  matrix.forEach((row,y) =>
    row.forEach((val,x) => {
      if (val) {
        const dy = y + offset.y;
        const dx = x + offset.x;
        if (dy >= 0 && dy < arena.length && dx >= 0 && dx < arena[0].length) {
          ctx.fillStyle = colors[val];
          ctx.fillRect(dx, dy, 1, 1);
        }
      }
    })
  );
}

// --- Основной рендеринг игры ---
function draw() {
  if (active.theme && mellBG.complete) {
    ctx.save(); ctx.setTransform(1,0,0,1,0,0);
    ctx.drawImage(mellBG, 0, 0, canvas.width, canvas.height);
    ctx.restore();
  } else {
    for (const t of themes.slice(1)) {
      if (active[t] && vids[t]?.readyState >= 2) {
        ctx.save(); ctx.setTransform(1,0,0,1,0,0);
        ctx.drawImage(vids[t], 0, 0, canvas.width, canvas.height);
        ctx.restore();
        break;
      }
    }
  }
  if (!Object.values(active).some(v => v)) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  drawMatrix(arena, { x:0, y:0 });
  drawMatrix(player.matrix, player.pos);
}

// --- Очистка заполненных линий ---
function arenaSweep() {
  let rowCount = 1;
  outer: for (let y=arena.length-1; y>=0; --y) {
    if (arena[y].every(v => v !== 0)) {
      const row = arena.splice(y,1)[0].fill(0);
      arena.unshift(row);
      score   += rowCount * 200;
      balance += rowCount * 200;
      rowCount *= 2;
      if (dropInterval > 200) dropInterval -= 50;
      updateScore();
      updateBalance();
      y++;
    }
  }
}

// --- Слияние фигуры с ареной ---
function merge(arena, player) {
  player.matrix.forEach((row,y) =>
    row.forEach((val,x) => {
      if (val) arena[y + player.pos.y][x + player.pos.x] = val;
    })
  );
}

// --- Сброс игрока и новая фигура ---
function playerReset() {
  const pieces = 'TJLOSZI';
  player.matrix = createPiece(pieces[Math.floor(Math.random()*pieces.length)]);
  player.pos.y = 0;
  player.pos.x = ((arena[0].length/2)|0) - ((player.matrix[0].length/2)|0);
  if (collide(arena,player)) {
    arena.forEach(r=>r.fill(0));
    score = 0; updateScore(); updateBalance();
  }
}

// --- Падение фигуры вниз ---
function playerDrop() {
  player.pos.y++;
  if (collide(arena,player)) {
    player.pos.y--;
    merge(arena,player);
    
// === Инициализация игры ===
playerReset();
    arenaSweep();
  }
  dropCounter = 0;
}

// --- Перемещение влево/вправо ---
function playerMove(dir) {
  player.pos.x += dir;
  if (collide(arena,player)) player.pos.x -= dir;
}

// --- Поворот фигуры игрока ---
function playerRotate(dir) {
  const pos = player.pos.x;
  let offset = 1;
  rotate(player.matrix,dir);
  while (collide(arena,player)) {
    player.pos.x += offset;
    offset = -(offset + (offset>0?1:-1));
    if (Math.abs(offset) > player.matrix[0].length) {
      rotate(player.matrix,-dir);
      player.pos.x = pos;
      break;
    }
  }
}

// --- Игровой цикл ---
function update(time=0) {
  const delta = time - lastTime;
  lastTime = time;
  dropCounter += delta;
  if (dropCounter > dropInterval) playerDrop();
  draw();
  requestAnimationFrame(update);
}

// === Управление с помощью кнопок на экране ===
['left','right','down','rotate'].forEach(id => {
  const btn = document.getElementById(id);
  let iv, tapped = false;
  const action = () => {
    if (id==='left')  playerMove(-1);
    if (id==='right') playerMove(1);
    if (id==='down')  playerDrop();
    if (id==='rotate')playerRotate(1);
  };
  btn.addEventListener('mousedown', ()=>{ tapped=false; action(); iv=setInterval(action,100); });
  btn.addEventListener('mouseup',   ()=>clearInterval(iv));
  btn.addEventListener('mouseleave',()=>clearInterval(iv));
  btn.addEventListener('click',     ()=>{ if(!tapped) action(); });
  btn.addEventListener('touchstart',e=>{ e.preventDefault(); tapped=false; action(); iv=setInterval(action,100); },{passive:false});
  btn.addEventListener('touchend',  e=>{ e.preventDefault(); clearInterval(iv); tapped=true; },{passive:false});
});

// === Управление с клавиатуры ===
document.addEventListener('keydown', e => {
  if (e.key==='ArrowLeft')  playerMove(-1);
  if (e.key==='ArrowRight') playerMove(1);
  if (e.key==='ArrowDown')  playerDrop();
  if (e.key==='ArrowUp')    playerRotate(1);
});

// === Инициализация игры ===
playerReset();
updateScore();
updateBalance();
update();

// === Firebase: онлайн-пользователи ===
const firebaseConfig = {
  apiKey: "AIzaSyB1N9wwPZh1vQkIt-V7by8FW-7xoZobsDg",
  authDomain: "tetris2-71bfa.firebaseapp.com",
  databaseURL: "https://tetris2-71bfa-default-rtdb.firebaseio.com",
  projectId: "tetris2-71bfa",
  storageBucket: "tetris2-71bfa.appspot.com",
  messagingSenderId: "38355194193",
  appId: "1:38355194193:web:93229f575c86111a8f7af0"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const id = Math.random().toString(36).substring(2);
const presenceRef = db.ref("/online/" + id);
presenceRef.set(true);
presenceRef.onDisconnect().remove();

db.ref("/online").on("value", (snapshot) => {
  const count = snapshot.numChildren();
  const el = document.getElementById("online-count");
  if (el) el.textContent = count;
});
