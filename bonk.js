// Constants
const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
const splashScreen = document.getElementById('splashScreen');
let collisionSound;
let audioContext;
let collisionBuffers = {};

// Set canvas size to match window
function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.scale(dpr, dpr);
}

// Initial canvas size
resizeCanvas();

document.addEventListener('DOMContentLoaded', async (event) => {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // Load all sound files
        //const soundFiles = ['G2.mp3', 'A2.mp3', 'B2.mp3', 'C2.mp3', 'D2.mp3', 'E2.mp3', 'F#2.mp3', 'G3.mp3'];
        const soundFiles = ['G2.mp3', 'B2.mp3', 'D2.mp3', 'G3.mp3'];
        for (const file of soundFiles) {
            const response = await fetch(`sounds/${file}`);
            const arrayBuffer = await response.arrayBuffer();
            collisionBuffers[file] = await audioContext.decodeAudioData(arrayBuffer);
            console.log(`Audio file ${file} loaded successfully`);
        }

        // Call initGame AFTER the sounds are loaded
        initGame();

    } catch (error) {
        console.error('Failed to load audio:', error);
    }
    initGame();
});

// Ball class
class Ball {
    constructor() {
        this.reset();
    }

    reset() {
        this.radius = Math.random() * 18 + 12;
        this.mass = Math.PI * this.radius ** 2;
        this.x = Math.random() * (canvas.width / window.devicePixelRatio - 2 * this.radius) + this.radius;
        this.y = Math.random() * (canvas.height / window.devicePixelRatio - 2 * this.radius) + this.radius;
        this.dx = (Math.random() - 0.5) * 5;
        this.dy = (Math.random() - 0.5) * 5;
        this.colour = `rgb(${Math.random() * 255},${Math.random() * 255},${Math.random() * 255})`;
        this.grabbed = false;
    }

    move() {
        if (!this.grabbed) {
            const velocityThreshold = 0.1;
            if (Math.abs(this.dx) < velocityThreshold && Math.abs(this.dy) < velocityThreshold) {
                this.dx = 0;
                this.dy = 0;
            }
    
            this.x += this.dx;
            this.y += this.dy;
            this.resolveBoundaryCollision();
        }
    }

    resolveBoundaryCollision() {
        const margin = 1;
        const canvasWidth = canvas.width / window.devicePixelRatio;
        const canvasHeight = canvas.height / window.devicePixelRatio;
        if (this.x - this.radius <= margin) {
            this.x = this.radius + margin;
            this.dx = Math.abs(this.dx);
        } else if (this.x + this.radius >= canvasWidth - margin) {
            this.x = canvasWidth - this.radius - margin;
            this.dx = -Math.abs(this.dx);
        }
        if (this.y - this.radius <= margin) {
            this.y = this.radius + margin;
            this.dy = Math.abs(this.dy);
        } else if (this.y + this.radius >= canvasHeight - margin) {
            this.y = canvasHeight - this.radius - margin;
            this.dy = -Math.abs(this.dy);
        }
    }

    draw() {
    const edgeWidth = 4;

    // Draw the main colored part of the ball
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.colour;
    ctx.fill();
    ctx.closePath();

        /* visual cue for lastthrown
        if (this === lastThrownBall) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius / 2, 0, Math.PI * 2); // Use half the ball's radius
            ctx.fillStyle = 'white'; 
            ctx.fill();
            ctx.closePath();
        } */
    }

    checkCollision(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < this.radius + other.radius;
    }

    getSpeed() {
        return Math.sqrt(this.dx * this.dx + this.dy * this.dy);
    }

    resolveCollision(other) {
        const dx = other.x - this.x;
        const dy = other.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const overlap = this.radius + other.radius - distance;
        
        if (overlap > 0) {
            const angle = Math.atan2(dy, dx);
            const moveX = overlap * Math.cos(angle) / 2;
            const moveY = overlap * Math.sin(angle) / 2;
            
            if (!this.grabbed && !other.grabbed) {
                this.x -= moveX;
                this.y -= moveY;
                other.x += moveX;
                other.y += moveY;

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

                const minSpeed = 0;
                const maxSpeed = 16;
                const minVolume = 0.2; // 20% minimum volume
                const thisSpeed = this.getSpeed();
                const otherSpeed = other.getSpeed();
                const collisionSpeed = Math.max(thisSpeed, otherSpeed);

                if (collisionSpeed > minSpeed && Object.keys(collisionBuffers).length > 0) {
                    try {
                        const soundFiles = Object.keys(collisionBuffers);
                        const randomIndex = Math.floor(Math.random() * soundFiles.length);
                        const randomSoundFile = soundFiles[randomIndex];

                        // Create a new buffer source and connect it to the destination
                        const source = audioContext.createBufferSource();
                        source.buffer = collisionBuffers[randomSoundFile];

                        // Create a gain node to control the volume
                        const gainNode = audioContext.createGain();
                        
                        // Calculate the volume based on collision speed with a minimum volume
                        const normalizedSpeed = (collisionSpeed - minSpeed) / (maxSpeed - minSpeed);
                        const volume = minVolume + (1 - minVolume) * normalizedSpeed;
                        const clampedVolume = Math.min(Math.max(volume, minVolume), 1);
                        
                        gainNode.gain.setValueAtTime(clampedVolume, audioContext.currentTime);

                        // Connect the source to the gain node, then to the destination
                        source.connect(gainNode);
                        gainNode.connect(audioContext.destination);

                        // Start the sound immediately
                        source.start();

                        // Add the new source to the activeSources array
                        activeSources.push(source);

                        // Cull older sources
                        if (activeSources.length > 20) {
                            activeSources.shift().stop(); // Stop the oldest source and remove it
                        }

                        console.log(`Collision speed: ${collisionSpeed.toFixed(2)}, Volume: ${clampedVolume.toFixed(2)}`);
                    } catch (error) {
                        console.error("Error playing sound:", error);
                    }
                }
            } else if (this.grabbed) {
                other.x = this.x + (other.radius + this.radius) * Math.cos(angle);
                other.y = this.y + (other.radius + this.radius) * Math.sin(angle);
            } else if (other.grabbed) {
                this.x = other.x - (other.radius + this.radius) * Math.cos(angle);
                this.y = other.y - (other.radius + this.radius) * Math.sin(angle);
            }

            return true;
        }
        return false;
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
let lastThrownBall = null;
let collisionsAfterThrow = 0;
let activeSources = []; // Array to keep track of active audio sources

function initGame() {
    if (!canvas) {
        console.error('Canvas element not found');
        return;
    }

    window.addEventListener('resize', () => {
        resizeCanvas();
        resetGame();
    });
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
    lastThrownBall = null;
    collisionsAfterThrow = 0;
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
let lastGrabbedPos = null;

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
            for (let j = i + 1; j < balls.length; j++) {
                if (ball.checkCollision(balls[j])) {
                    if (ball.resolveCollision(balls[j])) {
                        collisionCount++;
                    }
                }
            }
            ball.draw();
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
        ctx.font = '16px sans-serif';
        
        const counterText = `${collisionCount} Bonks`;
        const textWidth = ctx.measureText(counterText).width;
        ctx.fillText(counterText, canvas.width / window.devicePixelRatio - textWidth - 6, 16);
        
        if (stoppedFor > 0) {
            const stoppedText = `Wow! Stopped for ${stoppedFor}s`;
            ctx.fillText(stoppedText, 6, 16);
        }

        lastTime = currentTime;
    }

    requestAnimationFrame(gameLoop);
}

function getEventPos(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: (event.clientX - rect.left) * scaleX / window.devicePixelRatio,
        y: (event.clientY - rect.top) * scaleY / window.devicePixelRatio
    };
}

function handleStart(event) {
    event.preventDefault();
    const currentTime = Date.now();
    const pos = getEventPos(event);
    interactionStartPos = pos;
    lastCursorTime = currentTime;
    lastGrabbedPos = pos;

    if (!gameRunning) {
        splashScreen.style.display = 'none';
        gameRunning = true;
        return;
    }

    for (const ball of balls) {
        if (ball.checkGrabbed(pos)) {
            grabbedBall = ball;
            ball.grabbed = true;
            ball.dx = 0;
            ball.dy = 0;
            lastThrownBall = null;
            collisionsAfterThrow = 0;
            break;
        }
    }
}

function handleMove(event) {
    event.preventDefault();
    const pos = getEventPos(event);

    if (grabbedBall) {
        const dx = pos.x - lastGrabbedPos.x;
        const dy = pos.y - lastGrabbedPos.y;
        const speed = Math.sqrt(dx * dx + dy * dy);
        const maxSpeed = 30;
        const normalizedSpeed = Math.min(speed, maxSpeed) / maxSpeed;

        grabbedBall.x = pos.x;
        grabbedBall.y = pos.y;

        balls.forEach(ball => {
            if (ball !== grabbedBall && grabbedBall.checkCollision(ball)) {
                const angle = Math.atan2(ball.y - grabbedBall.y, ball.x - grabbedBall.x);
                const pushForce = 10 * normalizedSpeed;
                ball.dx += Math.cos(angle) * pushForce;
                ball.dy += Math.sin(angle) * pushForce;
            }
        });

        lastGrabbedPos = pos;
    }
}

function handleEnd(event) {
    event.preventDefault();
    if (grabbedBall) {
        const pos = getEventPos(event);
        const timeDelta = (Date.now() - lastCursorTime) / 1000;
        const maxVelocity = 16;
        grabbedBall.dx = Math.max(-maxVelocity, Math.min(maxVelocity, (pos.x - interactionStartPos.x) / (timeDelta * 10)));
        grabbedBall.dy = Math.max(-maxVelocity, Math.min(maxVelocity, (pos.y - interactionStartPos.y) / (timeDelta * 10)));
        grabbedBall.grabbed = false;
        lastThrownBall = grabbedBall;
        collisionsAfterThrow = 0;
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