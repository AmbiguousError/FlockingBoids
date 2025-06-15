// boids.js

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('boids-canvas');
    const ctx = canvas.getContext('2d');
    const container = document.getElementById('simulation-container');

    let flock = [];
    const flockSize = 150;

    // Sliders
    const separationSlider = document.getElementById('separation-slider');
    const alignmentSlider = document.getElementById('alignment-slider');
    const cohesionSlider = document.getElementById('cohesion-slider');
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
            if (this.position.x > canvas.width) {
                this.position.x = 0;
            } else if (this.position.x < 0) {
                this.position.x = canvas.width;
            }
            if (this.position.y > canvas.height) {
                this.position.y = 0;
            } else if (this.position.y < 0) {
                this.position.y = canvas.height;
            }
        }

        applyForce(force) {
            this.acceleration.x += force.x;
            this.acceleration.y += force.y;
        }

        align(boids) {
            let steering = { x: 0, y: 0 };
            let total = 0;
            for (let other of boids) {
                let d = Math.sqrt(Math.pow(this.position.x - other.position.x, 2) + Math.pow(this.position.y - other.position.y, 2));
                if (other !== this && d < this.perceptionRadius) {
                    steering.x += other.velocity.x;
                    steering.y += other.velocity.y;
                    total++;
                }
            }
            if (total > 0) {
                steering.x /= total;
                steering.y /= total;
                // Set to maxSpeed
                const speed = Math.sqrt(steering.x * steering.x + steering.y * steering.y);
                steering.x = (steering.x / speed) * this.maxSpeed;
                steering.y = (steering.y / speed) * this.maxSpeed;

                steering.x -= this.velocity.x;
                steering.y -= this.velocity.y;

                // Limit the force
                const forceMag = Math.sqrt(steering.x * steering.x + steering.y * steering.y);
                if(forceMag > this.maxForce) {
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
                 let d = Math.sqrt(Math.pow(this.position.x - other.position.x, 2) + Math.pow(this.position.y - other.position.y, 2));
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

                 // Set to maxSpeed
                const speed = Math.sqrt(steering.x * steering.x + steering.y * steering.y);
                steering.x = (steering.x / speed) * this.maxSpeed;
                steering.y = (steering.y / speed) * this.maxSpeed;


                steering.x -= this.velocity.x;
                steering.y -= this.velocity.y;
                // Limit the force
                const forceMag = Math.sqrt(steering.x * steering.x + steering.y * steering.y);
                if(forceMag > this.maxForce) {
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
                let d = Math.sqrt(Math.pow(this.position.x - other.position.x, 2) + Math.pow(this.position.y - other.position.y, 2));
                if (other !== this && d < this.perceptionRadius) {
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

                 // Set to maxSpeed
                const speed = Math.sqrt(steering.x * steering.x + steering.y * steering.y);
                steering.x = (steering.x / speed) * this.maxSpeed;
                steering.y = (steering.y / speed) * this.maxSpeed;

                steering.x -= this.velocity.x;
                steering.y -= this.velocity.y;
                // Limit the force
                const forceMag = Math.sqrt(steering.x * steering.x + steering.y * steering.y);
                if(forceMag > this.maxForce) {
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

            separation.x *= separationSlider.value;
            separation.y *= separationSlider.value;
            alignment.x *= alignmentSlider.value;
            alignment.y *= alignmentSlider.value;
            cohesion.x *= cohesionSlider.value;
            cohesion.y *= cohesionSlider.value;


            this.applyForce(alignment);
            this.applyForce(cohesion);
            this.applyForce(separation);

        }

        update() {
            this.position.x += this.velocity.x;
            this.position.y += this.velocity.y;
            this.velocity.x += this.acceleration.x;
            this.velocity.y += this.acceleration.y;

            // limit speed
            const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
            if (speed > this.maxSpeed) {
                this.velocity.x = (this.velocity.x / speed) * this.maxSpeed;
                this.velocity.y = (this.velocity.y / speed) * this.maxSpeed;
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
        flock = [];
        for (let i = 0; i < flockSize; i++) {
            flock.push(new Boid());
        }
        animate();
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let boid of flock) {
            boid.edges();
            boid.flock(flock);
            boid.update();
            boid.draw(ctx);
        }

        requestAnimationFrame(animate);
    }

    window.addEventListener('resize', resizeCanvas);
    restartBtn.addEventListener('click', init);
    canvas.addEventListener('click', (event) => {
        let boid = new Boid();
        boid.position.x = event.offsetX;
        boid.position.y = event.offsetY;
        flock.push(boid);
    })

    init();
});
