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
        this.colour = `rgb(${Math.random() * 255},${Math.random() * 255},${Math.random() * 255})`;
        this.grabbed = false;
    }

    move() {
        if (!this.grabbed) {
            this.x += this.dx;
            this.y += this.dy;
            this.resolveBoundaryCollision();
        }
    }

    resolveBoundaryCollision() {
        const margin = 1;
        if (this.x - this.radius <= margin) {
            this.x = this.radius + margin;
            this.dx = Math.abs(this.dx);
        } else if (this.x + this.radius >= canvas.width - margin) {
            this.x = canvas.width - this.radius - margin;
            this.dx = -Math.abs(this.dx);
        }
        if (this.y - this.radius <= margin) {
            this.y = this.radius + margin;
            this.dy = Math.abs(this.dy);
        } else if (this.y + this.radius >= canvas.height - margin) {
            this.y = canvas.height - this.radius - margin;
            this.dy = -Math.abs(this.dy);
        }
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.colour;
        ctx.fill();
        ctx.closePath();
    }

    checkCollision(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < this.radius + other.radius;
    }

    resolveCollision(other) {
        const dx = other.x - this.x;
        const dy = other.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const overlap = this.radius + other.radius - distance;
        
        if (overlap > 0) {
            // Move balls apart
            const angle = Math.atan2(dy, dx);
            const moveX = overlap * Math.cos(angle) / 2;
            const moveY = overlap * Math.sin(angle) / 2;
            
            this.x -= moveX;
            this.y -= moveY;
            other.x += moveX;
            other.y += moveY;

            // Calculate new velocities
            const normalX = dx / distance;
            const normalY = dy / distance;
            const tangentX = -normalY;
            const tangentY = normalX;

            const dotProductThis = this.dx * normalX + this.dy * normalY;
            const dotProductOther = other.dx * normalX + other.dy * normalY;

            const v1n = (dotProductThis * (this.mass - other.mass) + 2 * other.mass * dotProductOther) / (this.mass + other.mass);
            const v2n = (dotProductOther * (other.mass - this.mass) + 2 * this.mass * dotProductThis) / (this.mass + other.mass);

            this.dx = v1n * normalX + (this.dx * tangentX + this.dy * tangentY) * tangentX;
            this.dy = v1n * normalY + (this.dx * tangentX + this.dy * tangentY) * tangentY;
            other.dx = v2n * normalX + (other.dx * tangentX + other.dy * tangentY) * tangentX;
            other.dy = v2n * normalY + (other.dx * tangentX + other.dy * tangentY) * tangentY;

            return true; // Collision occurred
        }
        return false; // No collision
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
let stoppedTime = 0;
let stoppedFor = 0;
let allBallsStopped = false;
let lastStopTime = 0;

function initGame() {
    if (!canvas) {
        console.error('Canvas element not found');
        return;
    }

    window.addEventListener('resize', resizeCanvas);
    resetGame();

    document.addEventListener('pointerdown', handleStart, false);
    canvas.addEventListener('pointermove', handleMove, false);
    canvas.addEventListener('pointerup', handleEnd, false);
    canvas.addEventListener('pointercancel', handleEnd, false);
    canvas.addEventListener('dblclick', handleDoubleTap, false);

    showSplashScreen();
    requestAnimationFrame(gameLoop);
}

function resetGame() {
    balls = Array.from({ length: 15 }, () => new Ball());
    separateOverlappingBalls();
    collisionCount = 0;
    stoppedTime = 0;
    stoppedFor = 0;
    allBallsStopped = false;
}

function separateOverlappingBalls() {
    const iterations = 10;
    for (let i = 0; i < iterations; i++) {
        let overlapsFound = false;
        for (let j = 0; j < balls.length; j++) {
            for (let k = j + 1; k < balls.length; k++) {
                if (balls[j].resolveCollision(balls[k])) {
                    overlapsFound = true;
                }
            }
        }
        if (!overlapsFound) break;
    }
}

function showSplashScreen() {
    splashScreen.style.display = 'flex';
}

const FIXED_TIME_STEP = 1000 / 60;
let lastTime = 0;

function gameLoop(currentTime) {
    if (!gameRunning) {
        requestAnimationFrame(gameLoop);
        return;
    }

    if (currentTime - lastTime >= FIXED_TIME_STEP) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        let allStopped = true;
        balls.forEach((ball, i) => {
            ball.move();
            ball.draw();
            for (let j = i + 1; j < balls.length; j++) {
                if (ball.checkCollision(balls[j])) {
                    ball.resolveCollision(balls[j]);
                    collisionCount++;
                }
            }
            if (ball.dx !== 0 || ball.dy !== 0) {
                allStopped = false;
            }
        });

        if (allStopped) {
            if (!allBallsStopped) {
                allBallsStopped = true;
                lastStopTime = currentTime;
            } else {
                stoppedFor = Math.floor((currentTime - lastStopTime) / 1000);
            }
        } else {
            allBallsStopped = false;
        }

        ctx.fillStyle = 'black';
        ctx.font = '16px Serif';
        
        // Collision counter
        const counterText = `${collisionCount} bonks`;
        const textWidth = ctx.measureText(counterText).width;
        ctx.fillText(counterText, canvas.width - textWidth - 10, 16);
        
        // Stopped time counter
        if (stoppedFor > 0) {
            const stoppedText = `wow! stopped for ${stoppedFor}s`;
            ctx.fillText(stoppedText, 10, 16);
        }

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

    if (!gameRunning) {
        splashScreen.style.display = 'none';
        gameRunning = true;
        return;
    }

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
        const timeDelta = (Date.now() - lastCursorTime) / 1000;
        const maxVelocity = 15;
        grabbedBall.dx = Math.max(-maxVelocity, Math.min(maxVelocity, (pos.x - interactionStartPos.x) / (timeDelta * 10)));
        grabbedBall.dy = Math.max(-maxVelocity, Math.min(maxVelocity, (pos.y - interactionStartPos.y) / (timeDelta * 10)));
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

window.onload = initGame;
