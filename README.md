# CircleMagic3D
Circle Magic 3D is an interactive, browser-based art generator for creating beautiful and complex 3D spirographs and orbital patterns. Built with the powerful three.js library, this tool allows you to design intricate systems of celestial bodies and visualize their paths in a fully 3D environment.

Whether you're creating a simple solar system or a complex, multi-layered spirograph, Circle Magic 3D provides the controls to bring your geometric art to life.

Features

    Multi-Planet Simulation: Create systems with multiple "planets," each with its own unique properties.

    Hierarchical Parenting: Design complex motions by making planets orbit other planets, not just the central sun.

    Dual Drawing Modes:

        Orbital Paths: Trace the individual orbital path of each planet.

        Connecting Lines: Draw lines between planets on each frame to create classic, intricate spirograph patterns.

    Full 3D Interaction: Use your mouse to pan, zoom, and rotate the camera to view your creation from any angle.

    Stereoscopic 3D: Render the scene in a side-by-side stereo format, with controls for eye separation, focal distance, and swapping views for cross-eyed or parallel viewing.

    Animation Control: Watch your patterns unfold in real-time with an adjustable FPS slider, or disable animation to instantly render the final, complex image.

    Parameter Customization: Fine-tune every aspect of the simulation, including distances, speeds, orbital inclination, colors, and more.

    Save & Load: Export your favorite configurations to a JSON file and import them later to continue your work.

    High-Quality Export:

        Save images at whatever resolution you configure for the canvas.

        Record animations as smooth, high-quality WebM video files.

Getting Started

To run this project, you need a modern web browser and a simple local server.

Why a Local Server?

Modern browsers have security policies that prevent web pages from loading local files (like our script.js when it's treated as a module). A local server bypasses this issue. The easiest way to do this is with the Live Server extension in Visual Studio Code.

Installation & Setup

    Get the Files: Make sure your project folder contains the following files:

        index.html

        script.js

    Open in VS Code: Open your project folder in Visual Studio Code.

    Install Live Server: If you don't have it, go to the Extensions tab in VS Code and search for and install "Live Server".

    Launch: Right-click on your index.html file in the VS Code explorer and select "Open with Live Server". Your browser will open, and the application will be running.

How to Use

The user interface on the left provides full control over the simulation.

Actions

    Draw: Starts the animation based on the current planet settings and view options. Clicking this will interrupt any current animation and start a new one.

    Random: Generates a new random system with 2-4 planets and automatically draws it.

    Reset: Clears the screen and resets the simulation to a single, simple default planet, allowing you to design a new system from scratch.

    Stop: Immediately halts the current animation.

Planet Configuration

    Add New Planet: Adds a new planet to the system.

    Planet Selector (Dropdown): Choose which planet you are currently editing.

    Remove Planet (X button): Deletes the currently selected planet.

    Selected Planet Properties:

        Dist X / Dist Y: Sets the semi-major and semi-minor axes of the planet's orbit. Set them to the same value for a perfect circle, or different values for an ellipse.

        Speed: Controls how fast the planet moves in its orbit (degrees per step).

        Inclination: Tilts the planet's orbital plane, turning a flat 2D orbit into a 3D one.

        Azimuth: Rotates the entire tilted orbital plane around the central axis.

        Planet Radius: Sets the size of the planet's sphere.

        Color: Sets the color of the planet and its orbital trail.

        Parent Body: Determines which object this planet orbits. This is the key to creating moons and complex hierarchical systems.

View & Drawing Options

    Draw Style:

        Draw Orbital Paths: The default mode. Traces the path of each individual planet through space.

        Draw Connecting Lines: Draws lines between every pair of planets on each frame. This is the mode for creating classic spirograph art.

    Enable Animation:

        Checked: The pattern will be drawn step-by-step.

        Unchecked: The final, complete image will be rendered instantly when you click "Draw".

    Total Steps / Full Revolution: The "Total Steps" input determines how long the animation runs. The "Full Revolution" label automatically calculates the number of steps needed for the entire pattern to repeat (based on the LCM of the planets' speeds).

    Canvas Size: Set the dimensions of the 3D viewport in pixels. Click "Apply Size" to see the change.

    FPS Slider: Controls the frame rate of the animation, from 1 to 60 frames per second.

Stereoscopic 3D Controls

    Enable Stereo View: Toggles the side-by-side 3D rendering.

    Swap L/R Views: Swaps the left and right eye images, allowing you to switch between parallel viewing and cross-eyed viewing.

    Focal Distance: Adjusts the point in 3D space where the two stereo cameras converge. For the best 3D effect, try to match this to the distance of your main subject.

    Eye Separation: Increases or decreases the distance between the two stereo cameras, strengthening or weakening the 3D depth effect.

Exporting Your Creation

    Save Image: Renders the complete pattern using the current canvas dimensions (stereo mode doubles the width) and downloads it as a PNG file.

    Record Movie: Records the animation at the current canvas resolution and saves it as a WebM video file. Click the button to start, and the video will be saved automatically when the animation finishes.

    Export/Import Params: Save your entire system configuration (all planets and settings) to a JSON file, and load it back in later.

Built With

    three.js - The amazing 3D library that makes this all possible.
