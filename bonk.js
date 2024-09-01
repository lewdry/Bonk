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
        this.radius = Math.random() * 20 + 10;
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
            // Store previous position for CCD
            this.prevX = this.x;
            this.prevY = this.y;

            // Update position
            this.x += this.dx;
            this.y += this.dy;

            // Check and resolve boundary collisions
            this.resolveBoundaryCollision();
        }
    }

    resolveBoundaryCollision() {
        const margin = 1; // 1px safety margin
        let collided = false;

        // Right boundary
        if (this.x + this.radius >= canvas.width - margin) {
            this.x = canvas.width - this.radius - margin;
            this.dx = -Math.abs(this.dx);
            collided = true;
        }
        // Left boundary
        else if (this.x - this.radius <= margin) {
            this.x = this.radius + margin;
            this.dx = Math.abs(this.dx);
            collided = true;
        }

        // Bottom boundary
        if (this.y + this.radius >= canvas.height - margin) {
            this.y = canvas.height - this.radius - margin;
            this.dy = -Math.abs(this.dy);
            collided = true;
        }
        // Top boundary
        else if (this.y - this.radius <= margin) {
            this.y = this.radius + margin;
            this.dy = Math.abs(this.dy);
            collided = true;
        }

        // If a collision occurred, slightly reduce velocity to prevent continuous bouncing
        if (collided) {
            this.dx *= 0.99;
            this.dy *= 0.99;
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
let lastCursorTime = 0;
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

    // Unified event listeners for both mouse and touch events
    canvas.addEventListener('pointerdown', handleStart, false);
    canvas.addEventListener('pointermove', handleMove, false);
    canvas.addEventListener('pointerup', handleEnd, false);
    canvas.addEventListener('pointercancel', handleEnd, false);
    canvas.addEventListener('dblclick', handleDoubleTap, false); // Desktop double-click

    showSplashScreen();
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
        ctx.font = '16px Serif';
        const counterText = `${collisionCount} bonks`;
        const textWidth = ctx.measureText(counterText).width;
        ctx.fillText(counterText, canvas.width - textWidth - 10, 16);

        lastTime = currentTime;
    }

    requestAnimationFrame(gameLoop);
}

function getEventPos(event) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
}

function handleStart(event) {
    event.preventDefault();
    const currentTime = Date.now();
    const pos = getEventPos(event);
    interactionStartPos = pos;
    lastCursorTime = currentTime;

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
    const pos = getEventPos(event);

    if (grabbedBall) {
        grabbedBall.x = pos.x;
        grabbedBall.y = pos.y;
    }
}

function handleEnd(event) {
    event.preventDefault();
    if (grabbedBall) {
        const pos = getEventPos(event);

        // Calculate the velocity based on the distance moved and time taken
        const timeDelta = (Date.now() - lastCursorTime) / 1000;

        // Prevent extremely high velocities by clamping them
        const maxVelocity = 15;
        grabbedBall.dx = Math.max(-maxVelocity, Math.min(maxVelocity, (pos.x - interactionStartPos.x) / (timeDelta * 10)));
        grabbedBall.dy = Math.max(-maxVelocity, Math.min(maxVelocity, (pos.y - interactionStartPos.y) / (timeDelta * 10)));

        // Release the ball
        grabbedBall.grabbed = false;
        grabbedBall = null;
    }
}

function handleDoubleTap(event) {
    event.preventDefault();
    const currentTime = Date.now();

    if (currentTime - lastCursorTime < 300) {
        resetGame();
    }
    lastCursorTime = currentTime;
}

// Initialize the game
window.onload = initGame;
