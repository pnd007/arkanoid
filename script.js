const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const menu = document.getElementById("menu");
const gameover = document.getElementById("gameover");
const leaderboardDiv = document.getElementById("leaderboard");
const scoresList = document.getElementById("scores");
const bonusMessage = document.getElementById("bonusMessage");

const paddle = { x: 430, y: 510, w: 100, h: 15, dx: 12 };
let ball = { x: 480, y: 300, r: 10, dx: 0, dy: 0 };
const blockW = 70, blockH = 30, spacing = 10;
let blocks = [], bonuses = [];
let lives = 3, level = 1, score = 0, paused = false, running = false;
let playerName = "";
let widenTimer = null, slowTimer = null;

function showMenu() {
  menu.style.display = "block";
  gameover.style.display = leaderboardDiv.style.display = "none";
  canvas.style.display = "none";
  bonusMessage.textContent = "";
}

function backToMenu() {
  showMenu();
}

function showLeaderboard() {
  scoresList.innerHTML = "";
  const scores = JSON.parse(localStorage.getItem("leaderboard") || "[]");
  scores.forEach((entry, i) => {
    const li = document.createElement("li");
    li.textContent = `${i + 1}. ${entry.name}: ${entry.score}`;
    scoresList.appendChild(li);
  });
  menu.style.display = gameover.style.display = "none";
  leaderboardDiv.style.display = "block";
}

function saveScore() {
  const scores = JSON.parse(localStorage.getItem("leaderboard") || "[]");
  scores.push({ name: playerName, score });
  scores.sort((a, b) => b.score - a.score);
  localStorage.setItem("leaderboard", JSON.stringify(scores.slice(0, 10)));
}

function startGame() {
  playerName = document.getElementById("playerName").value || "Игрок";
  menu.style.display = gameover.style.display = leaderboardDiv.style.display = "none";
  canvas.style.display = "block";
  bonusMessage.textContent = "";
  lives = 3;
  level = 1;
  score = 0;
  paused = false;
  paddle.w = 100;
  createBlocks();
  placeBall();
  running = true;
  requestAnimationFrame(update);
}

function gameOver() {
  saveScore();
  document.getElementById("finalScore").textContent = `Игра окончена! Счёт: ${score}`;
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
  const cols = 9;
  const rows = 5 + level - 1;
  const totalW = cols * blockW + (cols - 1) * spacing;
  const startX = (canvas.width - totalW) / 2;
  let strongLeft = 2 + (level - 1) * 2;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = startX + col * (blockW + spacing);
      const y = spacing + row * (blockH + spacing);
      let hits = 1,
        color = "green";
      if (row === rows - 1 || (strongLeft > 0 && Math.random() < 0.3)) {
        hits = 2;
        color = "yellow";
        strongLeft--;
      }
      blocks.push({ x, y, w: blockW, h: blockH, hits, color });
    }
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "blue";
  ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);

  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fillStyle = "red";
  ctx.fill();
  ctx.closePath();

  blocks.forEach((b) => {
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
  });

  bonuses.forEach((b) => {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 10, 0, Math.PI * 2);
    ctx.fillStyle = b.type === "life" ? "yellow" : b.type === "widen" ? "orange" : "purple";
    ctx.fill();
    ctx.closePath();
  });

  ctx.fillStyle = "white";
  ctx.font = "16px sans-serif";
  ctx.fillText(`Счёт: ${score}`, 20, 20);
  ctx.fillText(`Жизни: ${lives}`, 20, 40);
  ctx.fillText(`Уровень: ${level}`, 20, 60);
}

function update() {
  if (!running) return;

  if (!paused) {
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
        ball.dy *= -1;
      }

      for (let i = blocks.length - 1; i >= 0; i--) {
        const b = blocks[i];
        if (
          ball.x > b.x &&
          ball.x < b.x + b.w &&
          ball.y > b.y &&
          ball.y < b.y + b.h
        ) {
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
        if (
          b.y > paddle.y &&
          b.x > paddle.x &&
          b.x < paddle.x + paddle.w
        ) {
          let msg = "";
          if (b.type === "life") {
            lives++;
            msg = "+Жизнь!";
          }
          if (b.type === "widen") {
            paddle.w += 50;
            clearTimeout(widenTimer);
            widenTimer = setTimeout(() => (paddle.w = 100), 10000);
            msg = "+Ширина!";
          }
          if (b.type === "slow") {
            ball.dx = Math.sign(ball.dx) * Math.max(2, Math.abs(ball.dx) - 2);
            ball.dy = Math.sign(ball.dy) * Math.max(2, Math.abs(ball.dy) - 2);
            clearTimeout(slowTimer);
            slowTimer = setTimeout(() => {
              ball.dx = ball.dx > 0 ? 5 : -5;
              ball.dy = ball.dy > 0 ? 5 : -5;
            }, 10000);
            msg = "+Замедление!";
          }
          bonusMessage.textContent = `Бонус: ${msg}`;
          setTimeout(() => (bonusMessage.textContent = ""), 2000);
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

document.addEventListener("keydown", (e) => {
  if (e.key === " ") {
    if (ball.dx === 0 && ball.dy === 0) launchBall();
    else paused = !paused;
  }
  if (e.key === "ArrowLeft") paddle.x -= paddle.dx;
  if (e.key === "ArrowRight") paddle.x += paddle.dx;
});

showMenu();
