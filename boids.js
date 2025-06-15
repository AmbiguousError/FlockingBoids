document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('boids-canvas');
    const ctx = canvas.getContext('2d');
    const container = document.getElementById('simulation-container');

    let flock = [];
    let food = [];
    let predators = [];
    let fluid;
    const flockSize = 150;
    const foodCloudRadius = 30;

    let animationFrameId;

    // --- UI CONTROLS ---
    const separationSlider = document.getElementById('separation-slider');
    const alignmentSlider = document.getElementById('alignment-slider');
    const cohesionSlider = document.getElementById('cohesion-slider');
    const rippleDampingSlider = document.getElementById('ripple-damping-slider');
    const foodLifespanSlider = document.getElementById('food-lifespan-slider');
    const predatorCheckbox = document.getElementById('predator-checkbox');
    const predatorSpeedSlider = document.getElementById('predator-speed-slider');
    const fluidCheckbox = document.getElementById('fluid-checkbox');
    const spawnFoodBtn = document.getElementById('spawn-food-btn');
    const restartBtn = document.getElementById('restart-btn');

    function resizeCanvas() {
        canvas.width = container.offsetWidth;
        canvas.height = container.offsetHeight;
        // Better default resolution for performance
        fluid = new Fluid(canvas.width, canvas.height, 6);
    }
    
    // --- FLUID CLASS ---
    class Fluid {
        constructor(width, height, resolution) {
            this.resolution = resolution;
            this.cols = Math.floor(width / this.resolution);
            this.rows = Math.floor(height / this.resolution);

            this.current = new Array(this.cols).fill(0).map(() => new Array(this.rows).fill(0));
            this.previous = new Array(this.cols).fill(0).map(() => new Array(this.rows).fill(0));
        }

        disturb(x, y, pressure) {
            const col = Math.floor(x / this.resolution);
            const row = Math.floor(y / this.resolution);
            if (col > 1 && col < this.cols - 1 && row > 1 && row < this.rows - 1) {
                this.previous[col][row] = pressure;
            }
        }

        update() {
            let damping = parseFloat(rippleDampingSlider.value);
            for (let i = 1; i < this.cols - 1; i++) {
                for (let j = 1; j < this.rows - 1; j++) {
                    this.current[i][j] =
                        (this.previous[i - 1][j] +
                         this.previous[i + 1][j] +
                         this.previous[i][j - 1] +
                         this.previous[i][j + 1]) / 2 - this.current[i][j];
                    this.current[i][j] *= damping;
                }
            }
            let temp = this.previous;
            this.previous = this.current;
            this.current = temp;
        }

        render(ctx) {
            for (let i = 0; i < this.cols; i++) {
                for (let j = 0; j < this.rows; j++) {
                    const value = this.current[i][j];
                    const color = Math.min(50, Math.abs(value));
                    ctx.fillStyle = `rgb(0, 0, ${color})`;
                    ctx.fillRect(i * this.resolution, j * this.resolution, this.resolution, this.resolution);
                }
            }
        }
    }


    // --- FOOD CLASS ---
    class Food {
        constructor(x, y) {
            this.position = { x, y };
            this.radius = foodCloudRadius;
            this.initialLifespan = parseFloat(foodLifespanSlider.value);
            this.lifespan = this.initialLifespan;
        }

        deplete() { this.lifespan--; }

        draw(ctx) {
            const lifespanRatio = Math.max(0, this.lifespan / this.initialLifespan);
            const currentRadius = this.radius * lifespanRatio;
            const alpha = lifespanRatio * 0.7;
            ctx.fillStyle = `rgba(150, 200, 100, ${alpha})`;
            for (let i = 0; i < 30; i++) {
                const angle = Math.random() * 2 * Math.PI;
                const radius = Math.random() * currentRadius;
                const x = this.position.x + radius * Math.cos(angle);
                const y = this.position.y + radius * Math.sin(angle);
                ctx.beginPath();
                ctx.arc(x, y, Math.random() * 2 + 1, 0, 2 * Math.PI);
                ctx.fill();
            }
        }
    }
    
    // --- BASE MOVING AGENT CLASS ---
    class Agent {
         constructor() {
            this.position = { x: Math.random() * canvas.width, y: Math.random() * canvas.height };
            this.velocity = { x: Math.random() * 4 - 2, y: Math.random() * 4 - 2 };
            this.acceleration = { x: 0, y: 0 };
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
            
            if (fluid && fluidCheckbox.checked) {
                fluid.disturb(this.position.x, this.position.y, 1500);
            }
        }
    }

    // --- PREDATOR CLASS ---
    class Predator extends Agent {
        constructor() {
            super();
            this.maxSpeed = parseFloat(predatorSpeedSlider.value);
            this.maxForce = 0.7;
            this.color = '#ff4d4d';
        }

        draw(ctx) {
            ctx.save();
            ctx.translate(this.position.x, this.position.y);
            ctx.rotate(Math.atan2(this.velocity.y, this.velocity.x));
            ctx.beginPath();
            ctx.moveTo(15, 0);
            ctx.lineTo(-7, -7);
            ctx.lineTo(-7, 7);
            ctx.closePath();
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.restore();
        }

        seek(target) {
            let desired = { x: target.x - this.position.x, y: target.y - this.position.y };
            const mag = Math.hypot(desired.x, desired.y);
            if (mag > 0) {
                desired.x = (desired.x / mag) * this.maxSpeed;
                desired.y = (desired.y / mag) * this.maxSpeed;
            }
            let steer = { x: desired.x - this.velocity.x, y: desired.y - this.velocity.y };
            const forceMag = Math.hypot(steer.x, steer.y);
            if (forceMag > this.maxForce) {
                steer.x = (steer.x / forceMag) * this.maxForce;
                steer.y = (steer.y / forceMag) * this.maxForce;
            }
            return steer;
        }

        hunt(boids) {
            let closestBoid = null;
            let minDistance = Infinity;
            if (boids.length === 0) return { x: 0, y: 0 };
            for (let boid of boids) {
                let d = Math.hypot(this.position.x - boid.position.x, this.position.y - boid.position.y);
                if (d < minDistance) {
                    minDistance = d;
                    closestBoid = boid;
                }
            }
            if (closestBoid) {
                if (minDistance < 10) {
                    const index = flock.indexOf(closestBoid);
                    if (index > -1) flock.splice(index, 1);
                }
                return this.seek(closestBoid.position);
            }
            return { x: 0, y: 0 };
        }
    }

    // --- BOID CLASS ---
    class Boid extends Agent {
        constructor() {
            super();
            this.maxSpeed = 4;
            this.maxForce = 0.2;
            this.perceptionRadius = 50;
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

        flee(predators) {
            let steering = { x: 0, y: 0 };
            let total = 0;
            for (let predator of predators) {
                let d = Math.hypot(this.position.x - predator.position.x, this.position.y - predator.position.y);
                if (d > 0 && d < this.perceptionRadius * 2) {
                    let diff = { x: this.position.x - predator.position.x, y: this.position.y - predator.position.y };
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

        seekFood(food) {
            for (let f of food) {
                if (Math.hypot(this.position.x - f.position.x, this.position.y - f.position.y) < f.radius) {
                    f.deplete();
                }
            }
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
                const foodAttractionForce = 0.1;
                let desired = { x: closestFood.position.x - this.position.x, y: closestFood.position.y - this.position.y };
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
            return { x: 0, y: 0 };
        }

        flock(boids, food, predators) {
            let alignment = this.align(boids);
            let cohesion = this.cohesion(boids);
            let separation = this.separation(boids);
            let fleeSteer = this.flee(predators);
            let foodSteer = this.seekFood(food);

            alignment.x *= parseFloat(alignmentSlider.value);
            alignment.y *= parseFloat(alignmentSlider.value);
            cohesion.x *= parseFloat(cohesionSlider.value);
            cohesion.y *= parseFloat(cohesionSlider.value);
            separation.x *= parseFloat(separationSlider.value);
            separation.y *= parseFloat(separationSlider.value);
            fleeSteer.x *= 3.0;
            fleeSteer.y *= 3.0;

            this.applyForce(alignment);
            this.applyForce(cohesion);
            this.applyForce(separation);
            this.applyForce(foodSteer);
            this.applyForce(fleeSteer);
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
            ctx.fillStyle = '#00ffff'; // Changed color to cyan for visibility
            ctx.fill();
            ctx.restore();
        }
    }

    // --- MAIN SIMULATION ---
    function init() {
        resizeCanvas();
        flock = Array.from({ length: flockSize }, () => new Boid());
        food = [];
        predators = predatorCheckbox.checked ? [new Predator()] : [];
        if (!animationFrameId) animate();
    }

    function animate() {
        if (fluidCheckbox.checked) {
            fluid.update();
            fluid.render(ctx);
        } else {
            // If fluid is off, use the simple tracer effect
            ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        food = food.filter(f => f.lifespan > 0);
        food.forEach(f => f.draw(ctx));

        predators.forEach(p => {
            p.edges();
            const huntForce = p.hunt(flock);
            p.applyForce(huntForce);
            p.update();
            p.draw(ctx);
        });

        flock.forEach(boid => {
            boid.edges();
            boid.flock(flock, food, predators);
            boid.update();
            boid.draw(ctx);
        });

        animationFrameId = requestAnimationFrame(animate);
    }

    // --- EVENT LISTENERS ---
    window.addEventListener('resize', resizeCanvas);
    restartBtn.addEventListener('click', () => {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
        init();
    });
    spawnFoodBtn.addEventListener('click', () => {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        food.push(new Food(x, y));
        if (fluidCheckbox.checked) fluid.disturb(x,y, 2500);
    });
    predatorCheckbox.addEventListener('change', () => {
        predators = predatorCheckbox.checked ? [new Predator()] : [];
    });
    predatorSpeedSlider.addEventListener('input', () => {
        const newSpeed = parseFloat(predatorSpeedSlider.value);
        for(const p of predators) {
            p.maxSpeed = newSpeed;
        }
    });
    canvas.addEventListener('click', (event) => {
        if (fluidCheckbox.checked) fluid.disturb(event.offsetX, event.offsetY, 500);
    });

    init();
});
