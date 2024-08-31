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

// Ball class
class Ball {
    constructor() {
        this.reset();
    }

    reset() {
        this.radius = Math.random() * 40 + 10; // Random size between 10 and 50
        this.mass = Math.PI * this.radius ** 2;
        this.x = Math.random() * (canvas.width - 2 * this.radius) + this.radius;
        this.y = Math.random() * (canvas.height - 2 * this.radius) + this.radius;
        this.dx = (Math.random() - 0.5) * 5;
        this.dy = (Math.random() - 0.5) * 5;
        this.color = `rgb(${Math.random() * 255},${Math.random() * 255},${Math.random() * 255})`;
        this.grabbed = false;
    }

    move() {
        if (!this.grabbed) {
            this.x += this.dx;
            this.y += this.dy;

            if (this.x - this.radius <= 0 || this.x + this.radius >= canvas.width) {
                this.dx = -this.dx;
            }
            if (this.y - this.radius <= 0 || this.y + this.radius >= canvas.height) {
                this.dy = -this.dy;
            }
        }
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
    }

    checkCollision(other) {
        const distance = Math.hypot(this.x - other.x, this.y - other.y);
        return distance < this.radius + other.radius;
    }

    resolveCollision(other) {
        if (this.checkCollision(other)) {
            const normalX = other.x - this.x;
            const normalY = other.y - this.y;
            const normalLength = Math.hypot(normalX, normalY);
            const unitNormalX = normalX / normalLength;
            const unitNormalY = normalY / normalLength;

            const relVelX = other.dx - this.dx;
            const relVelY = other.dy - this.dy;
            const velAlongNormal = relVelX * unitNormalX + relVelY * unitNormalY;

            if (velAlongNormal > -0.01) return; // Small threshold to prevent sticking

            const restitution = 1;
            let impulse = -(1 + restitution) * velAlongNormal;
            impulse /= 1 / this.mass + 1 / other.mass;

            const impulseX = impulse * unitNormalX;
            const impulseY = impulse * unitNormalY;

            this.dx -= impulseX / this.mass;
            this.dy -= impulseY / this.mass;
            other.dx += impulseX / other.mass;
            other.dy += impulseY / other.mass;
        }
    }

    checkGrabbed(pos) {
        const distance = Math.hypot(this.x - pos.x, this.y - pos.y);
        return distance < this.radius;
    }
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

    function updateCountdown() {
        if (countdown > 0) {
            countdownElement.textContent = `Game starting in ${countdown}...`;
            countdown--;
            setTimeout(updateCountdown, 1000);
        } else {
            countdownElement.textContent = 'Go!';
            setTimeout(() => {
                document.getElementById('splashScreen').style.display = 'none';
                gameRunning = true;
            }, 1000);
        }
    }

    updateCountdown();
}
// Show splash screen and hide after 5 seconds
function showSplashScreen() {
    const splashScreen = document.getElementById('splashScreen');
    splashScreen.style.display = 'flex';
    startCountdown();
}
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

    showSplashScreen(); // Call this to show the splash screen
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
        ctx.font = `${Math.min(canvas.height * 0.05, 14)}px`;
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
