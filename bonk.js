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
        this.radius = Math.random() * 20 + 10; // Random size between 10 and 30
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

    checkGrabbed(mousePos) {
        const distance = Math.hypot(this.x - mousePos.x, this.y - mousePos.y);
        return distance < this.radius;
    }
}

// Game variables
let balls = [];
let collisionCount = 0;
let grabbedBall = null;
let mouseStartPos = null;
let lastClickTime = 0;
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

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mousemove', handleMouseMove);

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

function handleMouseDown(event) {
    const currentTime = Date.now();
    if (currentTime - lastClickTime < 300) {
        resetGame();
    }
    lastClickTime = currentTime;

    const rect = canvas.getBoundingClientRect();
    const mousePos = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };

    for (const ball of balls) {
        if (ball.checkGrabbed(mousePos)) {
            grabbedBall = ball;
            ball.grabbed = true;
            mouseStartPos = mousePos;
            break;
        }
    }
}

function handleMouseUp(event) {
    if (grabbedBall) {
        const rect = canvas.getBoundingClientRect();
        const mousePos = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };

        grabbedBall.dx = (mousePos.x - mouseStartPos.x) / 10;
        grabbedBall.dy = (mousePos.y - mouseStartPos.y) / 10;
        grabbedBall.grabbed = false;
        grabbedBall = null;
    }
}

function handleMouseMove(event) {
    if (grabbedBall) {
        const rect = canvas.getBoundingClientRect();
        grabbedBall.x = event.clientX - rect.left;
        grabbedBall.y = event.clientY - rect.top;
    }
}

// Initialize the game when the page loads
window.onload = initGame;

// Show splash screen on page load
window.addEventListener('load', showSplashScreen);
