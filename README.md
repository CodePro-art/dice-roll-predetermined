# Dice Game

This project implements a 3D dice game using **Cannon.js** for physics simulation, **Three.js** for rendering, and **lil-gui** for user interface controls.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [Controls](#controls)
- [How It Works](#how-it-works)

## Installation

1. Clone the repository:

    ```bash
    git clone https://github.com/CodePro-art/dice-game.git
    cd dice-game
    ```

2. Open the `index.html` file in your preferred web browser to play the game.

## Usage

The game automatically initializes and throws the dice upon loading. The user can specify the desired result for the sum of the two dice and re-throw the dice until the desired result is achieved.

## Controls

The game interface includes a control panel powered by **lil-gui**. The available controls are:

- `desiredResult`: Set the desired sum of the dice (range: 2-12).
- `throw!`: Button to throw the dice.

## How It Works

### Initialization

1. **Physics Setup**:
    - A physics world is created using Cannon.js with gravity and contact material properties (restitution and friction).

2. **Scene Setup**:
    - A Three.js scene is initialized with ambient and point lights, and a perspective camera.

3. **Dice Creation**
    - Dice meshes are created using custom geometry for rounded edges and notches.
    - Each die has a corresponding physics body in Cannon.js.

4. **Floor Creation**:
    - Four floor planes are added to the physics world to contain the dice.

### Dice Throw

- When the `throwMe` function is called, the dice are given initial positions and impulses to simulate a throw.
- The physics simulation runs to calculate the dice's motion and final resting positions.

### Result Calculation

- Once the dice come to rest, their orientations are checked to determine the top face value.
- The game re-throws the dice until the sum of the two dice matches the desired result.

## Link to Site

- Link: [https://predefined-dice-roller.netlify.app](https://predefined-dice-roller.netlify.app)

## Contact

For any questions or further information, feel free to contact:

- Netanel Mazuz: [netazuz@gmail.com](mailto:netazuz@gmail.com)
- GitHub: [CodePro-art](https://github.com/CodePro-art)
