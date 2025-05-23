// Полный JavaScript-код арканоида, повторяющий твою версию на pygame
// Включает уровни, бонусы, паузу, таблицу лидеров и меню (localStorage)

const canvas = document.getElementById("gameCanvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const ctx = canvas.getContext("2d");
const menu = document.getElementById("menu");
const gameover = document.getElementById("gameover");
const leaderboardDiv = document.getElementById("leaderboard");
const scoresList = document.getElementById("scores");

const paddle = { x: canvas.width / 2 - 50, y: canvas.height - 70, w: 100, h: 15, dx: 10 };
let ball = { x: canvas.width / 2, y: canvas.height / 2, r: 15, dx: 0, dy: 0 };
const blockW = 70, blockH = 30, spacing = 10;
let blocks = [], bonuses = [];
let lives = 3, level = 1, score = 0, paused = false, running = false;
let playerName = "";
let widenTimer = null, slowTimer = null;
let lastBonusTime = 0;

function showMenu() {
  menu.style.display = "block";
  gameover.style.display = leaderboardDiv.style.display = "none";
  canvas.style.display = "none";
}

function backToMenu() {
  showMenu();
}

function showLeaderboard() {
  scoresList.innerHTML = "";
  const scores = JSON.parse(localStorage.getItem("leaderboard") || "[]");
  scores.forEach((entry, i) => {
    const li = document.createElement("li");
    li.textContent = `${i+1}. ${entry.name}: ${entry.score}`;
    scoresList.appendChild(li);
  });
  menu.style.display = gameover.style.display = "none";
  leaderboardDiv.style.display = "block";
}

function saveScore() {
  const scores = JSON.parse(localStorage.getItem("leaderboard") || "[]");
  scores.push({ name: playerName, score });
  scores.sort((a,b) => b.score - a.score);
  localStorage.setItem("leaderboard", JSON.stringify(scores.slice(0, 10)));
}

function startGame() {
  playerName = document.getElementById("playerName").value || "Игрок";
  menu.style.display = gameover.style.display = leaderboardDiv.style.display = "none";
  canvas.style.display = "block";
  lives = 3; level = 1; score = 0; paused = false;
  paddle.w = 100;
  paddle.x = canvas.width / 2 - paddle.w / 2;
  paddle.y = canvas.height - 70;
  createBlocks();
  placeBall();
  running = true;
  requestAnimationFrame(update);
}

function gameOver() {
  saveScore();
  document.getElementById("finalScore").textContent = `Игра окончена! Ваш счёт: ${score}`;
  gameover.style.display = "block";
  canvas.style.display = "none";
  running = false;
}

function placeBall() {
  ball.x = paddle.x + paddle.w / 2;
  ball.y = paddle.y - ball.r;
  ball.dx = ball.dy = 0;
}

function launchBall() {
  const speed = 6 + level * 0.5;
  ball.dx = (Math.random() > 0.5 ? 1 : -1) * speed;
  ball.dy = -speed;
}

function createBlocks() {
  blocks = [];
  const cols = Math.floor((canvas.width - spacing) / (blockW + spacing));
  const rows = 5 + level - 1;
  const totalW = cols * blockW + (cols - 1) * spacing;
  const startX = (canvas.width - totalW) / 2;
  let strongLeft = 2 + (level - 1) * 2;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = startX + col * (blockW + spacing);
      const y = spacing + row * (blockH + spacing);
      let hits = 1, color = "green";
      if (row === rows - 1 || (strongLeft > 0 && Math.random() < 0.3)) {
        hits = 2; color = "yellow"; strongLeft--;
      }
      blocks.push({ x, y, w: blockW, h: blockH, hits, color });
    }
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#00BFFF";
  ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);

  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI*2);
  ctx.fillStyle = "#FF4500";
  ctx.fill();
  ctx.closePath();

  blocks.forEach(b => {
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
  });

  bonuses.forEach(b => {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 10, 0, Math.PI*2);
    ctx.fillStyle = b.type === "life" ? "yellow" : b.type === "widen" ? "orange" : "purple";
    ctx.fill();
    ctx.closePath();
  });

  ctx.fillStyle = "white";
  ctx.font = "24px Arial";
  ctx.fillText(`Счёт: ${score}`, 20, 35);
  ctx.fillText(`Жизни: ${lives}`, 20, 65);
  ctx.fillText(`Уровень: ${level}`, 20, 95);

  if (lastBonusTime > 0) {
    const elapsed = Math.floor((Date.now() - lastBonusTime) / 1000);
    ctx.fillStyle = "orange";
    ctx.fillText(`Бонус активен: ${10 - elapsed} сек`, 20, 125);
  }

  ctx.font = "20px Arial";
  ctx.fillText("БОНУСЫ:", 20, canvas.height - 120);
  ctx.fillStyle = "yellow";
  ctx.fillText("Жёлтый: +жизнь", 20, canvas.height - 95);
  ctx.fillStyle = "orange";
  ctx.fillText("Оранжевый: увеличение платформы на 10 сек", 20, canvas.height - 70);
  ctx.fillStyle = "purple";
  ctx.fillText("Фиолетовый: замедление мяча на 10 сек", 20, canvas.height - 45);

  ctx.fillStyle = "lightgray";
  ctx.font = "18px Arial";
  ctx.fillText("← → — движение, пробел — запуск/пауза", 20, canvas.height - 15);
}

function update() {
  if (!running) return;

  if (!paused) {
    if (paddleMoveLeft && paddle.x > 0) paddle.x -= paddle.dx;
    if (paddleMoveRight && paddle.x < canvas.width - paddle.w) paddle.x += paddle.dx;

    if (ball.dx !== 0 || ball.dy !== 0) {
      ball.x += ball.dx;
      ball.y += ball.dy;

      if (ball.x - ball.r < 0 || ball.x + ball.r > canvas.width) ball.dx *= -1;
      if (ball.y - ball.r < 0) ball.dy *= -1;

      if (
        ball.y + ball.r > paddle.y &&
        ball.x > paddle.x &&
        ball.x < paddle.x + paddle.w
      ) {
        const hitPoint = (ball.x - paddle.x) / paddle.w;
        const angle = (hitPoint - 0.5) * Math.PI / 3;
        const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
        ball.dx = speed * Math.sin(angle);
        ball.dy = -Math.abs(speed * Math.cos(angle));
      }

      for (let i = blocks.length - 1; i >= 0; i--) {
        const b = blocks[i];
        if (ball.x > b.x && ball.x < b.x + b.w && ball.y > b.y && ball.y < b.y + b.h) {
          b.hits--;
          ball.dy *= -1;
          if (b.hits === 1 && b.color === "yellow") b.color = "green";
          if (b.hits <= 0) {
            blocks.splice(i, 1);
            score += 10;
            if (Math.random() < 0.3) createBonus(b.x + blockW / 2, b.y + blockH / 2);
          }
        }
      }

      bonuses.forEach((b, i) => {
        b.y += 3;
        if (b.y > paddle.y && b.x > paddle.x && b.x < paddle.x + paddle.w) {
          lastBonusTime = Date.now();
          if (b.type === "life") lives++;
          if (b.type === "widen") {
            paddle.w += 50;
            clearTimeout(widenTimer);
            widenTimer = setTimeout(() => paddle.w = 100, 10000);
          }
          if (b.type === "slow") {
            ball.dx = Math.sign(ball.dx) * Math.max(2, Math.abs(ball.dx) - 2);
            ball.dy = Math.sign(ball.dy) * Math.max(2, Math.abs(ball.dy) - 2);
            clearTimeout(slowTimer);
            slowTimer = setTimeout(() => {
              ball.dx = ball.dx > 0 ? 5 : -5;
              ball.dy = ball.dy > 0 ? 5 : -5;
            }, 10000);
          }
          bonuses.splice(i, 1);
        }
      });

      if (ball.y > canvas.height) {
        lives--;
        if (lives <= 0) {
          gameOver();
          return;
        } else {
          placeBall();
        }
      }

      if (blocks.length === 0) {
        level++;
        if (level > 5) {
          gameOver();
          return;
        } else {
          createBlocks();
          placeBall();
        }
      }
    }
  }

  draw();
  requestAnimationFrame(update);
}

function createBonus(x, y) {
  const types = ["life", "widen", "slow"];
  const type = types[Math.floor(Math.random() * types.length)];
  bonuses.push({ x, y, type });
}

let paddleMoveLeft = false;
let paddleMoveRight = false;

document.addEventListener("keydown", e => {
  if (e.key === "ArrowLeft") paddleMoveLeft = true;
  if (e.key === "ArrowRight") paddleMoveRight = true;
  if (e.key === " ") {
    if (ball.dx === 0 && ball.dy === 0) launchBall();
    else paused = !paused;
  }
});

document.addEventListener("keyup", e => {
  if (e.key === "ArrowLeft") paddleMoveLeft = false;
  if (e.key === "ArrowRight") paddleMoveRight = false;
});

showMenu();
