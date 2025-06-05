const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const restartBtn = document.getElementById('restart-btn');
const hitSound = document.getElementById('hit-sound');
const powerupSound = document.getElementById('powerup-sound');
const levelupSound = document.getElementById('levelup-sound');

const playerRadius = 22;
const powerupRadius = 15;

let player = { x: 300, y: 200, vx: 0, vy: 0, speed: 4 };
let keys = {};
let mouse = { x: 300, y: 200 };
let enemies = [];
let powerups = [];
let running = false;
let startTime = 0;
let lastEnemySpawn = 0;
let lastPowerupSpawn = 0;
let lastLevelUp = 0;
let score = 0;
let level = 1;
let enemySpawnInterval = 900;
let enemySpeedBase = 1.7;
let powerupActive = null;
let powerupEndTime = 0;

// Unlock sounds after user interaction (required by browsers)
let soundsUnlocked = false;
function unlockSounds() {
  if (!soundsUnlocked) {
    [hitSound, powerupSound, levelupSound].forEach(audio => {
      audio.volume = 0;
      audio.play().then(() => audio.pause()).catch(()=>{});
      audio.currentTime = 0;
      audio.volume = 1;
    });
    soundsUnlocked = true;
  }
}
window.addEventListener('pointerdown', unlockSounds, { once: true });
window.addEventListener('keydown', unlockSounds, { once: true });

function resetGame() {
  player = { x: 300, y: 200, vx: 0, vy: 0, speed: 4 };
  enemies = [];
  powerups = [];
  keys = {};
  mouse = { x: 300, y: 200 };
  running = true;
  score = 0;
  level = 1;
  enemySpawnInterval = 900;
  enemySpeedBase = 1.7;
  powerupActive = null;
  powerupEndTime = 0;
  startTime = performance.now();
  lastEnemySpawn = startTime;
  lastPowerupSpawn = startTime;
  lastLevelUp = startTime;
  restartBtn.classList.add('hidden');
  scoreDisplay.textContent = `Time: 0.00s | Level: 1`;
  requestAnimationFrame(gameLoop);
}

function spawnEnemy() {
  const edge = Math.floor(Math.random() * 4);
  let x, y;
  const size = 26 + Math.random() * 16;
  const speed = enemySpeedBase + Math.random() * 1.2 + score * 0.01;
  if (edge === 0) { // Top
    x = Math.random() * canvas.width;
    y = -size;
  } else if (edge === 1) { // Right
    x = canvas.width + size;
    y = Math.random() * canvas.height;
  } else if (edge === 2) { // Bottom
    x = Math.random() * canvas.width;
    y = canvas.height + size;
  } else { // Left
    x = -size;
    y = Math.random() * canvas.height;
  }
  const dx = player.x - x;
  const dy = player.y - y;
  const len = Math.sqrt(dx*dx + dy*dy);
  const vx = (dx / len) * speed;
  const vy = (dy / len) * speed;
  enemies.push({ x, y, vx, vy, size });
}

function spawnPowerup() {
  const types = ['speed', 'slow'];
  const type = types[Math.floor(Math.random() * types.length)];
  const padding = 40;
  const x = Math.random() * (canvas.width - 2 * padding) + padding;
  const y = Math.random() * (canvas.height - 2 * padding) + padding;
  powerups.push({ x, y, type, radius: powerupRadius, active: true });
}

function updatePlayer() {
  if (keys['arrowleft'] || keys['a']) player.vx = -player.speed;
  else if (keys['arrowright'] || keys['d']) player.vx = player.speed;
  else player.vx = 0;
  if (keys['arrowup'] || keys['w']) player.vy = -player.speed;
  else if (keys['arrowdown'] || keys['s']) player.vy = player.speed;
  else player.vy = 0;

  const dx = mouse.x - player.x;
  const dy = mouse.y - player.y;
  const dist = Math.sqrt(dx*dx + dy*dy);
  if (dist > playerRadius/2) {
    player.x += dx * 0.07;
    player.y += dy * 0.07;
  }

  player.x += player.vx;
  player.y += player.vy;

  player.x = Math.max(playerRadius, Math.min(canvas.width - playerRadius, player.x));
  player.y = Math.max(playerRadius, Math.min(canvas.height - playerRadius, player.y));
}

function updateEnemies() {
  let speedModifier = 1;
  if (powerupActive === 'slow') speedModifier = 0.5;
  for (let enemy of enemies) {
    enemy.x += enemy.vx * speedModifier;
    enemy.y += enemy.vy * speedModifier;
  }
  enemies = enemies.filter(e =>
    e.x > -60 && e.x < canvas.width + 60 &&
    e.y > -60 && e.y < canvas.height + 60
  );
}

function checkCollisions() {
  for (let enemy of enemies) {
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist < playerRadius + enemy.size/2) {
      running = false;
      hitSound.currentTime = 0;
      hitSound.play();
      restartBtn.classList.remove('hidden');
    }
  }
  for (let i = powerups.length - 1; i >= 0; i--) {
    const p = powerups[i];
    if (!p.active) continue;
    const dx = p.x - player.x;
    const dy = p.y - player.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist < playerRadius + p.radius) {
      activatePowerup(p.type);
      powerups.splice(i, 1);
      powerupSound.currentTime = 0;
      powerupSound.play();
    }
  }
}

function activatePowerup(type) {
  powerupActive = type;
  powerupEndTime = performance.now() + 7000;
  if (type === 'speed') {
    player.speed = 7;
  }
}

function drawPlayer() {
  ctx.save();
  ctx.shadowColor = '#00ff88';
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.arc(player.x, player.y, playerRadius, 0, Math.PI * 2);
  ctx.fillStyle = '#00ff88';
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.arc(player.x, player.y, playerRadius, 0, Math.PI * 2);
  ctx.strokeStyle = '#228B22';
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawEnemies() {
  for (let enemy of enemies) {
    ctx.save();
    ctx.shadowColor = '#ff5555';
    ctx.shadowBlur = 12;
    ctx.fillStyle = 'red';
    ctx.fillRect(enemy.x - enemy.size/2, enemy.y - enemy.size/2, enemy.size, enemy.size);
    ctx.restore();
    ctx.strokeStyle = '#b20000';
    ctx.lineWidth = 2;
    ctx.strokeRect(enemy.x - enemy.size/2, enemy.y - enemy.size/2, enemy.size, enemy.size);
  }
}

function drawPowerups() {
  for (let p of powerups) {
    ctx.save();
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = p.type === 'speed' ? 'limegreen' : 'deepskyblue';
    ctx.fill();
    ctx.restore();

    ctx.beginPath();
    ctx.strokeStyle = '#0a5500';
    ctx.lineWidth = 2;
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function gameLoop(now) {
  if (!running) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  updatePlayer();
  updateEnemies();
  checkCollisions();

  drawPlayer();
  drawEnemies();
  drawPowerups();

  if (powerupActive && now > powerupEndTime) {
    powerupActive = null;
    player.speed = 4;
  }

  score = (now - startTime) / 1000;

  if (now - lastLevelUp > 15000) {
    level++;
    enemySpawnInterval = Math.max(350, enemySpawnInterval - 100);
    enemySpeedBase += 0.3;
    lastLevelUp = now;
    levelupSound.currentTime = 0;
    levelupSound.play();
  }

  scoreDisplay.textContent = `Time: ${score.toFixed(2)}s | Level: ${level}`;

  if (now - lastEnemySpawn > enemySpawnInterval) {
    spawnEnemy();
    lastEnemySpawn = now;
  }

  if (now - lastPowerupSpawn > 12000 + Math.random() * 6000) {
    spawnPowerup();
    lastPowerupSpawn = now;
  }

  requestAnimationFrame(gameLoop);
}

window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);
canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;
});
restartBtn.addEventListener('click', resetGame);

resetGame();