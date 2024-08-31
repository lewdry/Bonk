// Constants
const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
const splashScreen = document.getElementById('splashScreen');

// Set canvas size to match window
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// Initial canvas size
resizeCanvas();

// Ball class (unchanged)
class Ball {
    // ... (Ball class implementation remains the same)
}

// Game variables
let balls = [];
let collisionCount = 0;
let grabbedBall = null;
let interactionStartPos = null;
let lastInteractionTime = 0;
let gameRunning = false;

// Update the countdown every second
function startCountdown() {
    const countdownElement = document.getElementById('countdown');
    let countdown = 5; // Start from 5 seconds

    countdownElement.textContent = `starting in ${countdown}...`;

    const interval = setInterval(() => {
        countdown--;
        if (countdown > 0) {
            countdownElement.textContent = `starting in ${countdown}...`;
        } else {
            countdownElement.textContent = ''; // Clear countdown text
            clearInterval(interval); // Stop countdown
            gameRunning = true;
        }
    }, 1000);
}

// Show splash screen and hide after 5 seconds
function showSplashScreen() {
    splashScreen.style.display = 'flex';
    startCountdown();
    setTimeout(() => {
        splashScreen.style.display = 'none';
    }, 5000);
}

function initGame() {
    if (!canvas) {
        console.error('Canvas element not found');
        return;
    }

    window.addEventListener('resize', resizeCanvas);
    resetGame();

    // Add event listeners for both mouse and touch events
    canvas.addEventListener('touchstart', handleStart, false);
    canvas.addEventListener('mousedown', handleStart, false);
    canvas.addEventListener('touchmove', handleMove, false);
    canvas.addEventListener('mousemove', handleMove, false);
    canvas.addEventListener('touchend', handleEnd, false);
    canvas.addEventListener('mouseup', handleEnd, false);
    canvas.addEventListener('touchcancel', handleEnd, false);
    canvas.addEventListener('touchstart', handleDoubleTap, false);
    canvas.addEventListener('dblclick', handleDoubleTap, false);

    requestAnimationFrame(gameLoop);
}

function resetGame() {
    balls = Array.from({ length: 15 }, () => new Ball());
    collisionCount = 0;
}

const FIXED_TIME_STEP = 1000 / 60; // 60 FPS
let lastTime = 0;

function gameLoop(currentTime) {
    if (!gameRunning) {
        requestAnimationFrame(gameLoop);
        return;
    }

    if (currentTime - lastTime >= FIXED_TIME_STEP) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        balls.forEach((ball, i) => {
            ball.move();
            ball.draw();
            for (let j = i + 1; j < balls.length; j++) {
                if (ball.checkCollision(balls[j])) {
                    ball.resolveCollision(balls[j]);
                    collisionCount++;
                }
            }
        });

        // Display collision counter
        ctx.fillStyle = 'black';
        ctx.font = `${Math.min(canvas.height * 0.05, 24)}px Arial`;
        const counterText = `${collisionCount} bonks`;
        const textWidth = ctx.measureText(counterText).width;
        ctx.fillText(counterText, canvas.width - textWidth - 10, Math.min(canvas.height * 0.05, 24));

        lastTime = currentTime;
    }

    requestAnimationFrame(gameLoop);
}

function getEventPos(event) {
    const rect = canvas.getBoundingClientRect();
    const clientX = event.clientX || (event.touches && event.touches[0].clientX);
    const clientY = event.clientY || (event.touches && event.touches[0].clientY);
    return {
        x: clientX - rect.left,
        y: clientY - rect.top
    };
}

function handleStart(event) {
    event.preventDefault();
    const currentTime = Date.now();
    if (currentTime - lastInteractionTime < 300) {
        handleDoubleTap(event);
    }
    lastInteractionTime = currentTime;

    const pos = getEventPos(event);
    interactionStartPos = pos;

    for (const ball of balls) {
        if (ball.checkGrabbed(pos)) {
            grabbedBall = ball;
            ball.grabbed = true;
            break;
        }
    }
}

function handleMove(event) {
    event.preventDefault();
    if (grabbedBall) {
        const pos = getEventPos(event);
        grabbedBall.x = pos.x;
        grabbedBall.y = pos.y;
    }
}

function handleEnd(event) {
    event.preventDefault();
    if (grabbedBall) {
        const pos = getEventPos(event);
        grabbedBall.dx = (pos.x - interactionStartPos.x) / 10;
        grabbedBall.dy = (pos.y - interactionStartPos.y) / 10;
        grabbedBall.grabbed = false;
        grabbedBall = null;
    }
}

function handleDoubleTap(event) {
    event.preventDefault();
    resetGame();
}

// Initialize the game when the page loads
window.onload = initGame;

// Show splash screen on page load
window.addEventListener('load', showSplashScreen);
