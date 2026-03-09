const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const goalsEl = document.getElementById("goals");
const pucksEl = document.getElementById("pucks");
const highScoreEl = document.getElementById("highScore");
const ppEl = document.getElementById("pp");
const ppPill = document.getElementById("ppPill");

const W = canvas.width;
const H = canvas.height;

const boardThickness = 22;
const playLeft = boardThickness;
const playRight = W - boardThickness;
const playWidth = playRight - playLeft;

const cols = 10;
const rows = 5;
const gap = 8;
const topPad = 150;
const blockW = (playWidth - gap * (cols - 1)) / cols;
const blockH = 42;

const teamNames = [
  "BOS", "BUF", "DET", "FLA", "MTL", "OTT", "TBL", "TOR",
  "CAR", "CBJ", "NJD", "NYI", "NYR", "PHI", "PIT", "WSH",
  "CHI", "COL", "DAL", "MIN", "NSH", "STL", "UTA", "WPG",
  "ANA", "CGY", "EDM", "LAK", "SEA", "SJS", "VAN", "VGK"
];

const teamColors = {
  ANA: { bg: "#F47A38", text: "#FFFFFF" },
  BOS: { bg: "#FFB81C", text: "#111111" },
  BUF: { bg: "#003087", text: "#FFFFFF" },
  CAR: { bg: "#CC0000", text: "#FFFFFF" },
  CBJ: { bg: "#002654", text: "#FFFFFF" },
  CGY: { bg: "#C8102E", text: "#FFFFFF" },
  CHI: { bg: "#CF0A2C", text: "#FFFFFF" },
  COL: { bg: "#6F263D", text: "#FFFFFF" },
  DAL: { bg: "#006847", text: "#FFFFFF" },
  DET: { bg: "#CE1126", text: "#FFFFFF" },
  EDM: { bg: "#FF4C00", text: "#FFFFFF" },
  FLA: { bg: "#C8102E", text: "#FFFFFF" },
  LAK: { bg: "#111111", text: "#FFFFFF" },
  MIN: { bg: "#154734", text: "#FFFFFF" },
  MTL: { bg: "#AF1E2D", text: "#FFFFFF" },
  NJD: { bg: "#CE1126", text: "#FFFFFF" },
  NSH: { bg: "#FFB81C", text: "#111111" },
  NYI: { bg: "#00539B", text: "#FFFFFF" },
  NYR: { bg: "#0038A8", text: "#FFFFFF" },
  OTT: { bg: "#C52032", text: "#FFFFFF" },
  PHI: { bg: "#F74902", text: "#FFFFFF" },
  PIT: { bg: "#FCB514", text: "#111111" },
  SEA: { bg: "#001628", text: "#99D9D9" },
  SJS: { bg: "#006D75", text: "#FFFFFF" },
  STL: { bg: "#002F87", text: "#FFFFFF" },
  TBL: { bg: "#002868", text: "#FFFFFF" },
  TOR: { bg: "#00205B", text: "#FFFFFF" },
  UTA: { bg: "#6CA8D6", text: "#F8F9FA" },
  VAN: { bg: "#00843D", text: "#FFFFFF" },
  VGK: { bg: "#B4975A", text: "#111111" },
  WPG: { bg: "#041E42", text: "#FFFFFF" },
  WSH: { bg: "#041E42", text: "#FFFFFF" },
};

const teamAccents = {
  ANA: "#B09862", BOS: "#111111", BUF: "#FFB81C", CAR: "#111111", CBJ: "#CE1126",
  CGY: "#F1BE48", CHI: "#111111", COL: "#236192", DAL: "#8F8F8C", DET: "#FFFFFF",
  EDM: "#041E42", FLA: "#041E42", LAK: "#A2AAAD", MIN: "#A6192E", MTL: "#003DA5",
  NJD: "#111111", NSH: "#041E42", NYI: "#F47D30", NYR: "#CE1126", OTT: "#C2912C",
  PHI: "#111111", PIT: "#111111", SEA: "#99D9D9", SJS: "#EA7200", STL: "#FCB514",
  TBL: "#FFFFFF", TOR: "#FFFFFF", UTA: "#F8F9FA", VAN: "#00205B", VGK: "#333F42",
  WPG: "#7B303E", WSH: "#C8102E",
};

const goal = {
  w: 190,
  h: 24,
  x: (W - 190) / 2,
  y: 28,
};

const BASE_PUCK_SPEED = 390;
const BURST_MIN_SPEED = 320;
const BURST_MAX_SPEED = 430;
const BASE_BOUNCE_MIN_SPEED = 340;
const POWER_PLAY_SPEED_MULT = 1.35;
const HIGH_SCORE_KEY = "power_play_puck_breaker_high_score";

const stick = {
  x: W / 2,
  y: H - 42,
  w: 138,
  h: 12,
};

const state = {
  score: 0,
  goals: 0,
  highScore: 0,
  blocks: [],
  pucks: [],
  powerPlay: 0,
  flashGoal: 0,
  gameOver: false,
  started: false,
  powerPlaySpeedOn: false,
};

function loadHighScore() {
  try {
    const value = Number(localStorage.getItem(HIGH_SCORE_KEY));
    if (!Number.isFinite(value) || value < 0) return 0;
    return Math.floor(value);
  } catch {
    return 0;
  }
}

function saveHighScore(score) {
  try {
    localStorage.setItem(HIGH_SCORE_KEY, String(Math.floor(score)));
  } catch {
    // Ignore storage failures and keep gameplay running.
  }
}

function updateHighScore() {
  if (state.score > state.highScore) {
    state.highScore = Math.floor(state.score);
    saveHighScore(state.highScore);
  }
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function addPoints(points) {
  const mult = state.powerPlay > 0 ? 2 : 1;
  state.score += points * mult;
  updateHighScore();
}

function makeBlocks() {
  state.blocks = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = playLeft + c * (blockW + gap);
      const y = topPad + r * (blockH + gap);
      const idx = (r * cols + c + randInt(0, 10)) % teamNames.length;
      state.blocks.push({
        x,
        y,
        w: blockW,
        h: blockH,
        hp: 1,
        team: teamNames[idx],
        powerPlayBrick: Math.random() < 0.12,
      });
    }
  }
}

function spawnPuck(x, y, angle, speed = BASE_PUCK_SPEED) {
  const activeSpeed = state.powerPlaySpeedOn ? speed * POWER_PLAY_SPEED_MULT : speed;
  state.pucks.push({
    x,
    y,
    vx: Math.cos(angle) * activeSpeed,
    vy: Math.sin(angle) * activeSpeed,
    r: 8,
    alive: true,
  });
}

function spawnStartPuck() {
  state.pucks = [];
  const launchAngle = -Math.PI / 2 + (Math.random() * 0.5 - 0.25);
  spawnPuck(stick.x, stick.y - 14, launchAngle, BASE_PUCK_SPEED);
  state.started = true;
}

function spawnPowerPlayBurst(x, y) {
  const angle = -Math.PI / 2 + (Math.random() * 1.1 - 0.55);
  const speed = randInt(BURST_MIN_SPEED, BURST_MAX_SPEED);
  spawnPuck(x, y, angle, speed);
  state.powerPlay = 8;
}

function resetGame() {
  state.score = 0;
  state.goals = 0;
  state.powerPlay = 0;
  state.flashGoal = 0;
  state.gameOver = false;
  state.started = false;
  state.powerPlaySpeedOn = false;
  stick.x = W / 2;
  makeBlocks();
  spawnStartPuck();
}

function scaleAllPucks(multiplier) {
  for (const p of state.pucks) {
    p.vx *= multiplier;
    p.vy *= multiplier;
  }
}

function clampStick() {
  const half = stick.w / 2;
  if (stick.x - half < playLeft) stick.x = playLeft + half;
  if (stick.x + half > playRight) stick.x = playRight - half;
}

function handleStickMove(px) {
  stick.x = px;
  clampStick();
}

function collideCircleRect(p, b) {
  const nx = Math.max(b.x, Math.min(p.x, b.x + b.w));
  const ny = Math.max(b.y, Math.min(p.y, b.y + b.h));
  const dx = p.x - nx;
  const dy = p.y - ny;
  if ((dx * dx + dy * dy) > p.r * p.r) return false;

  if (Math.abs(dx) > Math.abs(dy)) p.vx *= -1;
  else p.vy *= -1;

  b.hp -= 1;
  if (b.hp <= 0) {
    addPoints(10);
    if (b.powerPlayBrick) spawnPowerPlayBurst(b.x + b.w / 2, b.y + b.h / 2);
  }
  return true;
}

function updatePuck(p, dt) {
  p.x += p.vx * dt;
  p.y += p.vy * dt;

  if (p.x - p.r <= playLeft) {
    p.x = playLeft + p.r;
    p.vx = Math.abs(p.vx);
  }
  if (p.x + p.r >= playRight) {
    p.x = playRight - p.r;
    p.vx = -Math.abs(p.vx);
  }

  if (p.y - p.r <= goal.y + goal.h) {
    const inGoal = p.x >= goal.x && p.x <= goal.x + goal.w;
    if (inGoal) {
      addPoints(1000);
      state.goals += 1;
      state.flashGoal = 0.35;
      p.y = goal.y + goal.h + p.r + 1;
      p.vy = Math.abs(p.vy);
    }
  }

  if (p.y - p.r < 0) {
    p.y = p.r;
    p.vy = Math.abs(p.vy);
  }

  const stickTop = stick.y - stick.h / 2;
  const stickBottom = stick.y + stick.h / 2;
  const stickLeft = stick.x - stick.w / 2;
  const stickRight = stick.x + stick.w / 2;

  const touchingStick =
    p.y + p.r >= stickTop &&
    p.y - p.r <= stickBottom &&
    p.x >= stickLeft &&
    p.x <= stickRight &&
    p.vy > 0;

  if (touchingStick) {
    p.y = stickTop - p.r - 1;
    const hit = (p.x - stick.x) / (stick.w / 2);
    const maxBounce = 1.05;
    const bounce = hit * maxBounce;
    const speed = Math.max(BASE_BOUNCE_MIN_SPEED, Math.hypot(p.vx, p.vy));
    p.vx = Math.sin(bounce) * speed;
    p.vy = -Math.abs(Math.cos(bounce) * speed);
  }

  for (const b of state.blocks) {
    if (b.hp <= 0) continue;
    if (collideCircleRect(p, b)) break;
  }

  if (p.y - p.r > H + 30) {
    p.alive = false;
  }
}

function update(dt) {
  if (state.gameOver) {
    syncHud();
    return;
  }

  if (state.flashGoal > 0) state.flashGoal -= dt;
  if (state.powerPlay > 0) state.powerPlay -= dt;

  if (!state.powerPlaySpeedOn && state.powerPlay > 0) {
    state.powerPlaySpeedOn = true;
    scaleAllPucks(POWER_PLAY_SPEED_MULT);
  } else if (state.powerPlaySpeedOn && state.powerPlay <= 0) {
    state.powerPlaySpeedOn = false;
    scaleAllPucks(1 / POWER_PLAY_SPEED_MULT);
  }

  for (const p of state.pucks) {
    if (p.alive) updatePuck(p, dt);
  }

  state.blocks = state.blocks.filter((b) => b.hp > 0);
  state.pucks = state.pucks.filter((p) => p.alive);

  if (state.blocks.length === 0) makeBlocks();

  if (state.started && state.pucks.length === 0) {
    state.gameOver = true;
  }

  syncHud();
}

function syncHud() {
  scoreEl.textContent = Math.floor(state.score);
  goalsEl.textContent = state.goals;
  pucksEl.textContent = state.pucks.length;
  highScoreEl.textContent = state.highScore;
  ppEl.textContent = state.powerPlay > 0 ? `${state.powerPlay.toFixed(1)}s` : "OFF";
  ppPill.classList.toggle("pp-on", state.powerPlay > 0);
}

function drawRinkBoards() {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, boardThickness, H);
  ctx.fillRect(W - boardThickness, 0, boardThickness, H);

  ctx.fillStyle = "#f0c53a";
  ctx.fillRect(0, H - 26, boardThickness, 26);
  ctx.fillRect(W - boardThickness, H - 26, boardThickness, 26);

  ctx.strokeStyle = "#d33";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(boardThickness, 0);
  ctx.lineTo(boardThickness, H);
  ctx.moveTo(W - boardThickness, 0);
  ctx.lineTo(W - boardThickness, H);
  ctx.stroke();
}

function drawRinkLines() {
  const zone1 = H * 0.28;
  const zone2 = H * 0.72;
  const center = H * 0.5;
  const cx = W / 2;

  ctx.strokeStyle = "rgba(15,75,150,0.7)";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(playLeft, zone1);
  ctx.lineTo(playRight, zone1);
  ctx.moveTo(playLeft, zone2);
  ctx.lineTo(playRight, zone2);
  ctx.stroke();

  ctx.strokeStyle = "rgba(210,25,35,0.75)";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(playLeft, center);
  ctx.lineTo(playRight, center);
  ctx.stroke();

  ctx.strokeStyle = "rgba(210,25,35,0.5)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, center, 58, 0, Math.PI * 2);
  ctx.stroke();

  const dots = [
    [playLeft + 120, zone1 + 70],
    [playRight - 120, zone1 + 70],
    [playLeft + 120, zone2 - 70],
    [playRight - 120, zone2 - 70],
    [cx, center],
  ];

  ctx.fillStyle = "rgba(210,25,35,0.75)";
  for (const [x, y] of dots) {
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGoal() {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(goal.x - 8, goal.y, goal.w + 16, goal.h + 10);
  ctx.strokeStyle = "#d81f26";
  ctx.lineWidth = 4;
  ctx.strokeRect(goal.x, goal.y + 2, goal.w, goal.h);

  if (state.flashGoal > 0) {
    ctx.fillStyle = "rgba(216,31,38,0.22)";
    ctx.fillRect(goal.x - 10, goal.y - 6, goal.w + 20, goal.h + 22);
  }
}

function drawBlocks() {
  for (const b of state.blocks) {
    const teamColor = teamColors[b.team] || { bg: "#1a6fb1", text: "#ffffff" };
    const accent = teamAccents[b.team] || "#ffffff";
    const brickFill = b.powerPlayBrick ? "#f9b233" : teamColor.bg;
    const stripeFill = b.powerPlayBrick ? "#c68916" : accent;
    const textFill = b.powerPlayBrick ? "#382100" : teamColor.text;

    ctx.fillStyle = brickFill;
    ctx.fillRect(b.x, b.y, b.w, b.h);

    ctx.fillStyle = stripeFill;
    ctx.fillRect(b.x, b.y + 4, b.w, 7);

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);

    ctx.fillStyle = textFill;
    ctx.font = "bold 16px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const label = b.powerPlayBrick ? `${b.team} PP` : b.team;
    ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2 + 3);
  }
}

function drawPucks() {
  for (const p of state.pucks) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = "#1d2329";
    ctx.fill();
    ctx.strokeStyle = "#666f77";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawStick() {
  const left = stick.x - stick.w / 2;
  const top = stick.y - stick.h / 2;

  ctx.fillStyle = "#8b5a2b";
  ctx.fillRect(left, top, stick.w, stick.h);

  ctx.strokeStyle = "#5e3818";
  ctx.lineWidth = 2;
  ctx.strokeRect(left, top, stick.w, stick.h);
}

function drawOverlayText() {
  if (!state.started || state.gameOver) {
    ctx.fillStyle = "rgba(7,40,64,0.75)";
    ctx.fillRect(playLeft + 60, H * 0.52, playWidth - 120, 88);

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.font = "bold 28px Trebuchet MS";
    const msg = state.gameOver ? "Game Over" : "Faceoff";
    ctx.fillText(msg, W / 2, H * 0.58);

    ctx.font = "bold 16px Trebuchet MS";
    ctx.fillText("Tap or click to start / restart", W / 2, H * 0.62);
  }

  if (state.powerPlay > 0) {
    ctx.fillStyle = "rgba(249,178,51,0.18)";
    ctx.fillRect(playLeft, 0, playWidth, H);
    ctx.fillStyle = "#7a3e00";
    ctx.font = "bold 30px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillText("POWER PLAY", W / 2, H - 84);
  }
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  drawRinkBoards();
  drawRinkLines();
  drawGoal();
  drawBlocks();
  drawPucks();
  drawStick();
  drawOverlayText();
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  const t = e.touches ? e.touches[0] : e;
  return {
    x: ((t.clientX - rect.left) / rect.width) * W,
    y: ((t.clientY - rect.top) / rect.height) * H,
  };
}

function startOrRestart() {
  if (state.gameOver || !state.started) {
    resetGame();
  }
}

canvas.addEventListener("mousemove", (e) => {
  const p = getPos(e);
  handleStickMove(p.x);
});

canvas.addEventListener("touchmove", (e) => {
  const p = getPos(e);
  handleStickMove(p.x);
  e.preventDefault();
}, { passive: false });

canvas.addEventListener("mousedown", (e) => {
  const p = getPos(e);
  handleStickMove(p.x);
  startOrRestart();
});

canvas.addEventListener("touchstart", (e) => {
  const p = getPos(e);
  handleStickMove(p.x);
  startOrRestart();
  e.preventDefault();
}, { passive: false });

window.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    startOrRestart();
  }
});

state.highScore = loadHighScore();
resetGame();
requestAnimationFrame(loop);
