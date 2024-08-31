// Constants
const WIDTH = 965;
const HEIGHT = 580;
const BALL_COUNT = 1;

// Ball class
class Ball {
    constructor() {
        this.reset();
    }

    reset() {
        this.radius = Math.floor(Math.random() * (30 - 10 + 1)) + 10;
        this.mass = Math.PI * this.radius ** 2;
        this.x = Math.random() * (WIDTH - 2 * this.radius) + this.radius;
        this.y = Math.random() * (HEIGHT - 2 * this.radius) + this.radius;
        this.dx = (Math.random() < 0.5 ? -1 : 1) * (Math.random() + 1);
        this.dy = (Math.random() < 0.5 ? -1 : 1) * (Math.random() + 1);
        this.color = `rgb(${Math.random() * 255},${Math.random() * 255},${Math.random() * 255})`;
        this.grabbed = false;
    }

    move() {
        if (!this.grabbed) {
            this.x += this.dx;
            this.y += this.dy;

            if (this.x - this.radius <= 0 || this.x + this.radius >= WIDTH) {
                this.dx = -this.dx;
            }
            if (this.y - this.radius <= 0 || this.y + this.radius >= HEIGHT) {
                this.dy = -this.dy;
            }
        }
    }

    draw(ctx) {
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

            if (velAlongNormal > 0) return;

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
let canvas, ctx;
let balls = [];
let collisionCount = 0;
let grabbedBall = null;
let mouseStartPos = null;
let lastClickTime = 0;

function initGame() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    resetGame();

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mousemove', handleMouseMove);

    requestAnimationFrame(gameLoop);
}

function resetGame() {
    balls = Array.from({ length: BALL_COUNT }, () => new Ball());
    collisionCount = 0;
}

function gameLoop() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    balls.forEach((ball, i) => {
        ball.move();
        ball.draw(ctx);
        for (let j = i + 1; j < balls.length; j++) {
            if (ball.checkCollision(balls[j])) {
                ball.resolveCollision(balls[j]);
                collisionCount++;
            }
        }
    });

    // Display collision counter
    ctx.fillStyle = 'black';
    ctx.font = '30px Arial';
    const counterText = `Collisions: ${collisionCount}`;
    const textWidth = ctx.measureText(counterText).width;
    ctx.fillText(counterText, WIDTH - textWidth - 10, 30);

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
