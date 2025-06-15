# Boids: Flocking Simulation 🐦

This is an interactive, browser-based simulation of flocking behavior, based on the classic "Boids" model developed by Craig Reynolds. It demonstrates how complex, life-like behavior can emerge from a few simple rules applied to individual agents (the "boids").

## The Concept

Each boid follows three simple rules based only on its local neighbors within a certain perception radius:

1.  **Separation:** Steer to avoid crowding local flockmates. Each boid checks if any neighbors are too close and steers away from them to avoid collisions.
2.  **Alignment:** Steer towards the average heading of local flockmates. Each boid tries to match the velocity of its neighbors.
3.  **Cohesion:** Steer to move toward the average position (center of mass) of local flockmates. This rule keeps the flock together.

Together, these rules create the mesmerizing, organic-looking movement of a flock of birds, a school of fish, or a swarm of insects.

## Features

* **Interactive Simulation:** Watch hundreds of boids flock in real-time on an HTML5 canvas.
* **Customizable Parameters:** Use sliders to adjust the influence of the three core rules (Separation, Alignment, Cohesion) and see the immediate effect on the flock's behavior.
* **Visualizations:** Toggle visual aids like perception radius to better understand how the boids are "seeing" their world.
* **Simple Controls:** Click to add new boids or restart the simulation with different settings.

## How to Use

1.  **Open `boids.html`:** Simply open the `boids.html` file in a modern web browser.
2.  **Observe:** Watch the boids move according to the default parameters.
3.  **Interact:**
    * Use the sliders in the control panel to change the weight of the separation, alignment, and cohesion rules.
    * Click anywhere on the canvas to add a new boid at that location.
    * Press the 'Restart' button to clear the canvas and start a new simulation with the current slider settings.

## Technologies Used

* **HTML5**
* **CSS3**
* **Vanilla JavaScript (ES6+)**

## Code Structure

* **`boids.html`**: The main file containing the page structure, canvas, and UI controls.
* **`boids.js`**: Contains the core application logic, including the `Boid` class and the animation loop.
* **`style.css`**: Provides the styling for the page layout and UI elements.
