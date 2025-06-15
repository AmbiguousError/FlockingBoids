// boids.js

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('boids-canvas');
    const ctx = canvas.getContext('2d');
    const container = document.getElementById('simulation-container');

    let flock = [];
    const flockSize = 150;
    let animationFrameId;

    // Sliders and controls
    const separationSlider = document.getElementById('separation-slider');
    const alignmentSlider = document.getElementById('alignment-slider');
    const cohesionSlider = document.getElementById('cohesion-slider');
    const tracerSlider = document.getElementById('tracer-slider');
    const restartBtn = document.getElementById('restart-btn');

    function resizeCanvas() {
        canvas.width = container.offsetWidth;
        canvas.height = container.offsetHeight;
    }

    class Boid {
        constructor() {
            this.position = { x: Math.random() * canvas.width, y: Math.random() * canvas.height };
            this.velocity = { x: Math.random() * 4 - 2, y: Math.random() * 4 - 2 };
            this.acceleration = { x: 0, y: 0 };
            this.maxForce = 0.2;
            this.maxSpeed = 4;
            this.perceptionRadius = 50;
        }

        edges() {
            if (this.position.x > canvas.width) this.position.x = 0;
            else if (this.position.x < 0) this.position.x = canvas.width;
            if (this.position.y > canvas.height) this.position.y = 0;
            else if (this.position.y < 0) this.position.y = canvas.height;
        }

        applyForce(force) {
            this.acceleration.x += force.x;
            this.acceleration.y += force.y;
        }

        // Steer towards the average heading of local flockmates
        align(boids) {
            let steering = { x: 0, y: 0 };
            let total = 0;
            for (let other of boids) {
                let d = Math.hypot(this.position.x - other.position.x, this.position.y - other.position.y);
                if (other !== this && d < this.perceptionRadius) {
                    steering.x += other.velocity.x;
                    steering.y += other.velocity.y;
                    total++;
                }
            }
            if (total > 0) {
                steering.x /= total;
                steering.y /= total;
                const mag = Math.hypot(steering.x, steering.y);
                if (mag > 0) {
                    steering.x = (steering.x / mag) * this.maxSpeed;
                    steering.y = (steering.y / mag) * this.maxSpeed;
                }
                steering.x -= this.velocity.x;
                steering.y -= this.velocity.y;
                const forceMag = Math.hypot(steering.x, steering.y);
                if (forceMag > this.maxForce) {
                    steering.x = (steering.x / forceMag) * this.maxForce;
                    steering.y = (steering.y / forceMag) * this.maxForce;
                }
            }
            return steering;
        }

        // Steer to move toward the average position of local flockmates
        cohesion(boids) {
            let steering = { x: 0, y: 0 };
            let total = 0;
            for (let other of boids) {
                let d = Math.hypot(this.position.x - other.position.x, this.position.y - other.position.y);
                if (other !== this && d < this.perceptionRadius) {
                    steering.x += other.position.x;
                    steering.y += other.position.y;
                    total++;
                }
            }
            if (total > 0) {
                steering.x /= total;
                steering.y /= total;
                steering.x -= this.position.x;
                steering.y -= this.position.y;
                const mag = Math.hypot(steering.x, steering.y);
                if (mag > 0) {
                    steering.x = (steering.x / mag) * this.maxSpeed;
                    steering.y = (steering.y / mag) * this.maxSpeed;
                }
                steering.x -= this.velocity.x;
                steering.y -= this.velocity.y;
                const forceMag = Math.hypot(steering.x, steering.y);
                if (forceMag > this.maxForce) {
                    steering.x = (steering.x / forceMag) * this.maxForce;
                    steering.y = (steering.y / forceMag) * this.maxForce;
                }
            }
            return steering;
        }

        // Steer to avoid crowding local flockmates
        separation(boids) {
            let steering = { x: 0, y: 0 };
            let total = 0;
            for (let other of boids) {
                let d = Math.hypot(this.position.x - other.position.x, this.position.y - other.position.y);
                if (other !== this && d > 0 && d < this.perceptionRadius) {
                    let diff = { x: this.position.x - other.position.x, y: this.position.y - other.position.y };
                    diff.x /= d;
                    diff.y /= d;
                    steering.x += diff.x;
                    steering.y += diff.y;
                    total++;
                }
            }
            if (total > 0) {
                steering.x /= total;
                steering.y /= total;
                const mag = Math.hypot(steering.x, steering.y);
                if (mag > 0) {
                    steering.x = (steering.x / mag) * this.maxSpeed;
                    steering.y = (steering.y / mag) * this.maxSpeed;
                }
                steering.x -= this.velocity.x;
                steering.y -= this.velocity.y;
                const forceMag = Math.hypot(steering.x, steering.y);
                if (forceMag > this.maxForce) {
                    steering.x = (steering.x / forceMag) * this.maxForce;
                    steering.y = (steering.y / forceMag) * this.maxForce;
                }
            }
            return steering;
        }

        flock(boids) {
            let alignment = this.align(boids);
            let cohesion = this.cohesion(boids);
            let separation = this.separation(boids);

            alignment.x *= parseFloat(alignmentSlider.value);
            alignment.y *= parseFloat(alignmentSlider.value);
            cohesion.x *= parseFloat(cohesionSlider.value);
            cohesion.y *= parseFloat(cohesionSlider.value);
            separation.x *= parseFloat(separationSlider.value);
            separation.y *= parseFloat(separationSlider.value);

            this.applyForce(alignment);
            this.applyForce(cohesion);
            this.applyForce(separation);
        }

        update() {
            this.position.x += this.velocity.x;
            this.position.y += this.velocity.y;
            this.velocity.x += this.acceleration.x;
            this.velocity.y += this.acceleration.y;

            const mag = Math.hypot(this.velocity.x, this.velocity.y);
            if (mag > this.maxSpeed) {
                this.velocity.x = (this.velocity.x / mag) * this.maxSpeed;
                this.velocity.y = (this.velocity.y / mag) * this.maxSpeed;
            }
            this.acceleration = { x: 0, y: 0 };
        }

        draw(ctx) {
            ctx.save();
            ctx.translate(this.position.x, this.position.y);
            ctx.rotate(Math.atan2(this.velocity.y, this.velocity.x));
            ctx.beginPath();
            ctx.moveTo(10, 0);
            ctx.lineTo(-5, -5);
            ctx.lineTo(-5, 5);
            ctx.closePath();
            ctx.fillStyle = 'white';
            ctx.fill();
            ctx.restore();
        }
    }

    function init() {
        resizeCanvas();
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        flock = [];
        for (let i = 0; i < flockSize; i++) {
            flock.push(new Boid());
        }
        if (!animationFrameId) {
            animate();
        }
    }

    function animate() {
        // Higher slider value gives longer trail (less fade)
        ctx.fillStyle = `rgba(0, 0, 0, ${1 - parseFloat(tracerSlider.value)})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (let boid of flock) {
            boid.edges();
            boid.flock(flock);
            boid.update();
            boid.draw(ctx);
        }

        animationFrameId = requestAnimationFrame(animate);
    }

    window.addEventListener('resize', resizeCanvas);
    restartBtn.addEventListener('click', () => {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        init();
    });
    canvas.addEventListener('click', (event) => {
        let boid = new Boid();
        boid.position.x = event.offsetX;
        boid.position.y = event.offsetY;
        flock.push(boid);
    });

    init();
});
