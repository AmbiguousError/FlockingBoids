// boids.js

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('boids-canvas');
    const ctx = canvas.getContext('2d');
    const container = document.getElementById('simulation-container');

    let flock = [];
    const flockSize = 150;
    let food = [];
    const foodAttractionForce = 0.1;
    const foodCloudRadius = 30;

    let animationFrameId;

    // Sliders and controls
    const separationSlider = document.getElementById('separation-slider');
    const alignmentSlider = document.getElementById('alignment-slider');
    const cohesionSlider = document.getElementById('cohesion-slider');
    const tracerSlider = document.getElementById('tracer-slider');
    const spawnFoodBtn = document.getElementById('spawn-food-btn');
    const restartBtn = document.getElementById('restart-btn');

    function resizeCanvas() {
        canvas.width = container.offsetWidth;
        canvas.height = container.offsetHeight;
    }

    class Food {
        constructor(x, y) {
            this.position = { x, y };
            this.radius = foodCloudRadius;
        }

        draw(ctx) {
            ctx.fillStyle = 'rgba(150, 200, 100, 0.7)';
            // Simulate a cloud of insects with many small circles
            for (let i = 0; i < 30; i++) {
                const angle = Math.random() * 2 * Math.PI;
                const radius = Math.random() * this.radius;
                const x = this.position.x + radius * Math.cos(angle);
                const y = this.position.y + radius * Math.sin(angle);
                const insectSize = Math.random() * 2 + 1;
                ctx.beginPath(); // Start a new path for each circle
                ctx.arc(x, y, insectSize, 0, 2 * Math.PI);
                ctx.fill(); // Fill each circle individually
            }
        }
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

        attractedTo(target) {
            let desired = { x: target.x - this.position.x, y: target.y - this.position.y };
            const mag = Math.hypot(desired.x, desired.y);
            if (mag > 0) {
                desired.x = (desired.x / mag) * this.maxSpeed;
                desired.y = (desired.y / mag) * this.maxSpeed;
            }
            let steer = { x: desired.x - this.velocity.x, y: desired.y - this.velocity.y };
            const forceMag = Math.hypot(steer.x, steer.y);
            if (forceMag > this.maxForce) {
                steer.x = (steer.x / forceMag) * this.maxForce * foodAttractionForce;
                steer.y = (steer.y / forceMag) * this.maxForce * foodAttractionForce;
            }
            return steer;
        }

        flock(boids, food) {
            let alignment = this.align(boids);
            let cohesion = this.cohesion(boids);
            let separation = this.separation(boids);
            let foodSteer = { x: 0, y: 0 };

            let closestFood = null;
            let minDistance = Infinity;
            for (let f of food) {
                let d = Math.hypot(this.position.x - f.position.x, this.position.y - f.position.y);
                if (d < minDistance) {
                    minDistance = d;
                    closestFood = f;
                }
            }

            if (closestFood) {
                foodSteer = this.attractedTo(closestFood.position);
            }

            alignment.x *= parseFloat(alignmentSlider.value);
            alignment.y *= parseFloat(alignmentSlider.value);
            cohesion.x *= parseFloat(cohesionSlider.value);
            cohesion.y *= parseFloat(cohesionSlider.value);
            separation.x *= parseFloat(separationSlider.value);
            separation.y *= parseFloat(separationSlider.value);
            
            this.applyForce(alignment);
            this.applyForce(cohesion);
            this.applyForce(separation);
            this.applyForce(foodSteer);
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
        food = [];
        for (let i = 0; i < flockSize; i++) {
            flock.push(new Boid());
        }
        if (!animationFrameId) {
            animate();
        }
    }

    function animate() {
        ctx.fillStyle = `rgba(0, 0, 0, ${1 - parseFloat(tracerSlider.value)})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (let f of food) {
            f.draw(ctx);
        }

        for (let boid of flock) {
            boid.edges();
            boid.flock(flock, food);
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
    spawnFoodBtn.addEventListener('click', () => {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        food.push(new Food(x, y));
    });
    canvas.addEventListener('click', (event) => {
        let boid = new Boid();
        boid.position.x = event.offsetX;
        boid.position.y = event.offsetY;
        flock.push(boid);
    });

    init();
});
