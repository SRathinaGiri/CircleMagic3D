import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- 1. SETUP THE 3D SCENE ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, 1024 / 768, 0.1, 20000);
const stereoCamera = new THREE.StereoCamera();
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });

const canvasContainer = document.getElementById('canvas-container');
canvasContainer.appendChild(renderer.domElement);

const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 32), new THREE.MeshBasicMaterial({ color: 0xffff00 }));
scene.add(sunMesh);

const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true;
camera.position.z = 500;

// --- 2. SETUP UI CONTROLS ---
const uiControls = {
    drawBtn: document.getElementById('drawBtn'),
    randomBtn: document.getElementById('randomBtn'),
    resetBtn: document.getElementById('resetBtn'),
    stopBtn: document.getElementById('stopBtn'),
    addPlanetBtn: document.getElementById('addPlanetBtn'),
    saveImageBtn: document.getElementById('saveImageBtn'),
    recordMovieBtn: document.getElementById('recordMovieBtn'),
    exportBtn: document.getElementById('exportBtn'),
    importFile: document.getElementById('importFile'),
    totalSteps: document.getElementById('totalSteps'),
    fov: document.getElementById('fov'),
    focalDistance: document.getElementById('focalDistance'),
    eyeSeparation: document.getElementById('eyeSeparation'),
    fovValue: document.getElementById('fovValue'),
    focalValue: document.getElementById('focalValue'),
    eyeSepValue: document.getElementById('eyeSepValue'),
    backColor: document.getElementById('backColor'),
    progressBar: document.getElementById('progressBar'),
    stereoToggle: document.getElementById('stereoToggle'),
    swapViewsBtn: document.getElementById('swapViewsBtn'),
    stereoOverlay: document.getElementById('stereo-overlay'),
    canvasWidth: document.getElementById('canvasWidth'),
    canvasHeight: document.getElementById('canvasHeight'),
    applySizeBtn: document.getElementById('applySizeBtn'),
    planetSelector: document.getElementById('planetSelector'),
    planetEditorContainer: document.getElementById('planet-editor'),
    removePlanetBtn: document.getElementById('removePlanetBtn'),
    animateToggle: document.getElementById('animateToggle'),
    revolutionStepsLabel: document.getElementById('revolutionStepsLabel'),
    fpsSlider: document.getElementById('fpsSlider'),
    fpsValue: document.getElementById('fpsValue'),
    drawStyleSelector: document.getElementById('drawStyleSelector'),
};

// --- 3. CORE LOGIC AND STATE ---
let planets = [];
let temporaryObjects = [];
let isDrawing = false;
let isDrawingCancelled = false;
let currentStep = 0;
let capturer = null;
let isStereoEnabled = true;
let isViewSwapped = false;
let selectedPlanetIndex = 0;
let isAnimationEnabled = true;
let fpsInterval = 1000 / 15;
let then = performance.now();
let drawStyle = 'orbit';
let animationEnabledBeforeCapture = null;

// --- 4. HELPER AND UI FUNCTIONS ---

function gcd(a, b) {
    return b === 0 ? a : gcd(b, a % b);
}

function lcm(a, b) {
    if (a === 0 || b === 0) return 0;
    return Math.abs(a * b) / gcd(a, b);
}

function calculateSpirographSteps() {
    if (planets.length === 0) {
        uiControls.revolutionStepsLabel.textContent = '- steps';
        return;
    }
    const speeds = planets.map(p => p.speed).filter(s => s !== 0);
    if (speeds.length === 0) {
        uiControls.revolutionStepsLabel.textContent = 'Infinite steps';
        return;
    }
    const multiplier = 100;
    const integerPeriods = speeds.map(s => Math.round((360 * multiplier) / (s * multiplier)));
    const totalSteps = integerPeriods.reduce((acc, current) => lcm(acc, current), 1);
    uiControls.revolutionStepsLabel.textContent = `${totalSteps} steps`;
}

function createPlanetEditor() {
    uiControls.planetEditorContainer.innerHTML = `
        <h3>Selected Planet Properties</h3>
        <div class="control-group"><label>Dist X</label><input type="number" id="editDistX"></div>
        <div class="control-group"><label>Dist Y</label><input type="number" id="editDistY"></div>
        <div class="control-group"><label>Speed</label><input type="number" id="editSpeed" step="0.1"></div>
        <div class="control-group"><label>Inclination</label><input type="range" id="editInclination" min="0" max="90" step="1"></div>
        <div class="control-group"><label>Azimuth</label><input type="range" id="editAzimuth" min="0" max="360" step="1"></div>
        <div class="control-group"><label>Planet Radius</label><input type="number" id="editRadius" min="0"></div>
        <div class="control-group"><label>Color</label><input type="color" id="editColor"></div>
        <div class="control-group"><label>Parent Body</label><select id="editParent"></select></div>
    `;
    const fields = ['DistX', 'DistY', 'Speed', 'Inclination', 'Azimuth', 'Radius', 'Color', 'Parent'];
    const propMap = { 'DistX': 'distanceX', 'DistY': 'distanceY', 'Speed': 'speed', 'Inclination': 'inclination', 'Azimuth': 'azimuth', 'Radius': 'radius', 'Color': 'color', 'Parent': 'parent' };
    fields.forEach(field => {
        const el = document.getElementById(`edit${field}`);
        el.addEventListener('input', (e) => {
            if (planets[selectedPlanetIndex]) {
                const prop = propMap[field];
                const value = e.target.type === 'color' ? e.target.value : parseFloat(e.target.value);
                planets[selectedPlanetIndex][prop] = isNaN(value) ? e.target.value : value;
                if (prop === 'speed') {
                    calculateSpirographSteps();
                }
                if (prop === 'parent') {
                    populateParentOptions(document.getElementById('editParent'));
                }
            }
        });
    });
}

function populatePlanetSelector() {
    uiControls.planetSelector.innerHTML = '';
    planets.forEach((p, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `Planet ${index + 1}`;
        uiControls.planetSelector.appendChild(option);
    });
    uiControls.planetSelector.value = selectedPlanetIndex;
    uiControls.removePlanetBtn.disabled = planets.length === 0;
}

function populateParentOptions(selectElement) {
    selectElement.innerHTML = '<option value="-1">Sun</option>';
    planets.forEach((p, index) => {
        if (index !== selectedPlanetIndex) {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `Planet ${index + 1}`;
            selectElement.appendChild(option);
        }
    });
}

function populateEditor() {
    const planet = planets[selectedPlanetIndex];
    if (!planet) {
        uiControls.planetEditorContainer.style.display = 'none';
        return;
    }
    uiControls.planetEditorContainer.style.display = 'block';
    document.getElementById('editDistX').value = planet.distanceX;
    document.getElementById('editDistY').value = planet.distanceY;
    document.getElementById('editSpeed').value = planet.speed;
    document.getElementById('editInclination').value = planet.inclination;
    document.getElementById('editAzimuth').value = planet.azimuth;
    document.getElementById('editRadius').value = planet.radius;
    document.getElementById('editColor').value = planet.color;
    const parentSelect = document.getElementById('editParent');
    populateParentOptions(parentSelect);
    parentSelect.value = planet.parent;
}

function updatePlanetUI() {
    populatePlanetSelector();
    populateEditor();
    calculateSpirographSteps();
}

const resetSystem = () => {
    isDrawing = false;
    isDrawingCancelled = true;
    currentStep = 0;
    uiControls.progressBar.value = 0;
    clearScene();
    planets = [{
        distanceX: 150,
        distanceY: 150,
        speed: 1,
        color: '#ffffff',
        parent: -1,
        inclination: 0,
        azimuth: 0,
        radius: 5
    }];
    selectedPlanetIndex = 0;
    updatePlanetUI();
    const size = new THREE.Vector2();
    renderer.getSize(size);
    renderScene(size.x, size.y);
};

const addPlanet = () => {
    const lastPlanet = planets[planets.length - 1];
    planets.push({
        distanceX: lastPlanet ? Math.round(lastPlanet.distanceX / 2) : 150,
        distanceY: lastPlanet ? Math.round(lastPlanet.distanceY / 2) : 150,
        speed: lastPlanet ? lastPlanet.speed + 1 : 1,
        color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`,
        parent: planets.length > 1 ? planets.length - 2 : -1,
        inclination: 0, azimuth: 0, radius: 5
    });
    selectedPlanetIndex = planets.length - 1;
    updatePlanetUI();
};

const drawRandom = () => {
    isDrawing = false;
    isDrawingCancelled = true;
    clearScene();
    const numPlanets = Math.floor(Math.random() * 3) + 2;
    planets = [];
    for (let i = 0; i < numPlanets; i++) {
        planets.push({
            distanceX: Math.floor(Math.random() * 200) + 50,
            distanceY: Math.floor(Math.random() * 200) + 50,
            speed: parseFloat((Math.random() * 5 + 0.1).toFixed(1)),
            color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`,
            parent: i === 0 ? -1 : Math.floor(Math.random() * i),
            inclination: Math.floor(Math.random() * 90),
            azimuth: Math.floor(Math.random() * 360),
            radius: Math.floor(Math.random() * 5) + 2,
        });
    }
    selectedPlanetIndex = 0;
    updatePlanetUI();
    draw();
};

const exportParams = () => {
    const settings = { planets, totalSteps: uiControls.totalSteps.value, backColor: uiControls.backColor.value, fov: uiControls.fov.value, focalDistance: uiControls.focalDistance.value, eyeSeparation: uiControls.eyeSeparation.value };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(settings, null, 2));
    const link = document.createElement('a');
    link.href = dataStr;
    link.download = "circle-magic-3d-params.json";
    link.click();
};

const importParams = (event) => {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const settings = JSON.parse(e.target.result);
            if (settings.planets && Array.isArray(settings.planets)) { planets = settings.planets; selectedPlanetIndex = 0; updatePlanetUI(); }
            Object.keys(settings).forEach(key => { if (uiControls[key] && key !== 'planets' && uiControls[key].value !== undefined) { uiControls[key].value = settings[key]; } });
            draw();
        } catch (error) { alert("Error parsing parameters file."); }
    };
    reader.readAsText(file);
};

const clearScene = () => {
    planets.forEach(p => {
        if (p.lineObject) { scene.remove(p.lineObject); p.lineObject.geometry.dispose(); p.lineObject.material.dispose(); }
        if (p.sphereObject) { scene.remove(p.sphereObject); p.sphereObject.geometry.dispose(); p.sphereObject.material.dispose(); }
    });
    planets.forEach(p => { p.lineObject = null; p.sphereObject = null; });
    temporaryObjects.forEach(obj => {
        scene.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
    });
    temporaryObjects = [];
};

function calculatePositionsAtStep(step) {
    const positions = new Array(planets.length);
    const calculated = new Array(planets.length).fill(false);
    let planetsCalculated = 0;
    let guard = 0;
    while (planetsCalculated < planets.length && guard < planets.length * 2) {
        for (let i = 0; i < planets.length; i++) {
            if (calculated[i]) continue;
            const p = planets[i];
            const parentReady = p.parent === -1 || calculated[p.parent];
            if (parentReady) {
                const parentPos = p.parent === -1 ? { x: 0, y: 0, z: 0 } : positions[p.parent];
                const orbitalAngle = (step * p.speed * Math.PI) / 180;
                let localX = p.distanceX * Math.cos(orbitalAngle);
                let localY = p.distanceY * Math.sin(orbitalAngle);
                const inclinationRad = p.inclination * Math.PI / 180;
                const azimuthRad = p.azimuth * Math.PI / 180;
                let y1 = localY * Math.cos(inclinationRad);
                let z1 = localY * Math.sin(inclinationRad);
                let x_final = localX * Math.cos(azimuthRad) - y1 * Math.sin(azimuthRad);
                let y_final = localX * Math.sin(azimuthRad) + y1 * Math.cos(azimuthRad);
                positions[i] = { x: parentPos.x + x_final, y: parentPos.y + y_final, z: parentPos.z + z1 };
                calculated[i] = true;
                planetsCalculated++;
            }
        }
        guard++;
    }
    return positions;
}


const draw = () => {
    isDrawing = false;
    isDrawingCancelled = true;
    isDrawing = true;
    isDrawingCancelled = false;
    uiControls.progressBar.value = 0;
    currentStep = 0;
    clearScene();

    const totalSteps = parseInt(uiControls.totalSteps.value);

    planets.forEach(planet => {
        const sphereGeometry = new THREE.SphereGeometry(planet.radius, 16, 16);
        const sphereMaterial = new THREE.MeshBasicMaterial({ color: planet.color });
        planet.sphereObject = new THREE.Mesh(sphereGeometry, sphereMaterial);
        planet.sphereObject.visible = (drawStyle === 'orbit');
        scene.add(planet.sphereObject);
    });

    if (drawStyle === 'connect') {
        const numPlanets = planets.length;
        const numSegmentsPerStep = (numPlanets * (numPlanets - 1)) / 2;
        const positions = new Float32Array(totalSteps * numSegmentsPerStep * 2 * 3);
        const colors = new Float32Array(totalSteps * numSegmentsPerStep * 2 * 3);
        const segmentGeometry = new THREE.BufferGeometry();
        segmentGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        segmentGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        const segmentMaterial = new THREE.LineBasicMaterial({ vertexColors: true });
        const lineSegments = new THREE.LineSegments(segmentGeometry, segmentMaterial);
        scene.add(lineSegments);
        temporaryObjects.push(lineSegments);
    } else { // 'orbit' style
        planets.forEach(planet => {
            const trailGeometry = new THREE.BufferGeometry();
            const positions = new Float32Array(totalSteps * 3);
            trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            const trailMaterial = new THREE.LineBasicMaterial({ color: planet.color });
            planet.lineObject = new THREE.Line(trailGeometry, trailMaterial);
            scene.add(planet.lineObject);
        });
    }
};

const fullRender = (onComplete) => {
    isDrawing = false;
    isDrawingCancelled = true;
    uiControls.progressBar.value = 0;
    clearScene();
    const totalSteps = parseInt(uiControls.totalSteps.value);

    const allPlanetPositions = [];
    planets.forEach(() => allPlanetPositions.push([]));
    for (let i = 0; i < totalSteps; i++) {
        const currentFramePositions = calculatePositionsAtStep(i);
        for (let p_idx = 0; p_idx < planets.length; p_idx++) {
            if (currentFramePositions[p_idx]) {
                allPlanetPositions[p_idx].push(currentFramePositions[p_idx]);
            }
        }
    }

    if (drawStyle === 'connect') {
        sunMesh.visible = false;
        const segments = [];
        const colors = [];
        const tempColor = new THREE.Color();

        for (let i = 0; i < totalSteps; i++) {
            for (let j = 0; j < planets.length; j++) {
                for (let k = j + 1; k < planets.length; k++) {
                    const pos1 = allPlanetPositions[j][i];
                    const pos2 = allPlanetPositions[k][i];
                    if (pos1 && pos2) {
                        segments.push(pos1.x, pos1.y, pos1.z, pos2.x, pos2.y, pos2.z);
                        tempColor.set(planets[j].color);
                        colors.push(tempColor.r, tempColor.g, tempColor.b);
                        colors.push(tempColor.r, tempColor.g, tempColor.b);
                    }
                }
            }
        }
        const segmentGeometry = new THREE.BufferGeometry();
        segmentGeometry.setAttribute('position', new THREE.Float32BufferAttribute(segments, 3));
        segmentGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        const segmentMaterial = new THREE.LineBasicMaterial({ vertexColors: true });
        const lineSegments = new THREE.LineSegments(segmentGeometry, segmentMaterial);
        scene.add(lineSegments);
        temporaryObjects.push(lineSegments);
    } else {
        sunMesh.visible = true;
        planets.forEach((planet, p_idx) => {
            const sphereGeometry = new THREE.SphereGeometry(planet.radius, 16, 16);
            const sphereMaterial = new THREE.MeshBasicMaterial({ color: planet.color });
            planet.sphereObject = new THREE.Mesh(sphereGeometry, sphereMaterial);
            scene.add(planet.sphereObject);

            const allPoints = allPlanetPositions[p_idx].flatMap(p => [p.x, p.y, p.z]);
            const trailGeometry = new THREE.BufferGeometry();
            trailGeometry.setAttribute('position', new THREE.Float32BufferAttribute(allPoints, 3));
            const trailMaterial = new THREE.LineBasicMaterial({ color: planet.color });
            planet.lineObject = new THREE.Line(trailGeometry, trailMaterial);
            scene.add(planet.lineObject);
            const lastPointIndex = allPoints.length - 3;
            if (lastPointIndex >= 0) {
                planet.sphereObject.position.set(allPoints[lastPointIndex], allPoints[lastPointIndex + 1], allPoints[lastPointIndex + 2]);
            }
        });
    }

    uiControls.progressBar.value = 100;
    if (onComplete) {
        onComplete();
    } else {
        const size = new THREE.Vector2();
        renderer.getSize(size);
        renderScene(size.x, size.y);
    }
};

const saveImage = () => {
    if (isDrawing || capturer) return alert("Please wait for other operations to finish.");
    const originalSize = new THREE.Vector2();
    renderer.getSize(originalSize);
    const currentStereoFactor = isStereoEnabled ? 2 : 1;
    let baseWidth = parseInt(uiControls.canvasWidth.value, 10);
    let baseHeight = parseInt(uiControls.canvasHeight.value, 10);
    if (isNaN(baseWidth) || baseWidth <= 0) {
        baseWidth = Math.max(1, Math.round(originalSize.x / currentStereoFactor));
    }
    if (isNaN(baseHeight) || baseHeight <= 0) {
        baseHeight = Math.max(1, Math.round(originalSize.y));
    }
    const targetWidth = baseWidth * currentStereoFactor;
    const targetHeight = baseHeight;
    renderer.setSize(targetWidth, targetHeight, false);
    const originalAspect = camera.aspect;
    camera.aspect = baseWidth / baseHeight;
    camera.updateProjectionMatrix();
    fullRender(() => {
        renderScene(targetWidth, targetHeight);
        const dataURL = renderer.domElement.toDataURL('image/png');
        const link = document.createElement('a');
        const downloadName = `circle-magic-${baseWidth}x${baseHeight}${isStereoEnabled ? '-stereo' : ''}.png`;
        link.download = downloadName;
        link.href = dataURL;
        link.click();
        renderer.setSize(originalSize.x, originalSize.y, false);
        camera.aspect = originalAspect;
        camera.updateProjectionMatrix();
        renderScene(originalSize.x, originalSize.y);
        draw();
    });
};

const recordMovie = () => {
    if (capturer) {
        finishCapture();
        return;
    }
    if (typeof CCapture === 'undefined') {
        alert('Recording is unavailable because the CCapture library failed to load.');
        return;
    }
    const wasDrawing = isDrawing && !isDrawingCancelled;
    animationEnabledBeforeCapture = isAnimationEnabled;
    if (!isAnimationEnabled) {
        isAnimationEnabled = true;
        uiControls.animateToggle.checked = true;
    }
    capturer = new CCapture({ format: 'webm', framerate: 60, verbose: true, quality: 90 });
    if (!wasDrawing) {
        draw();
    }
    capturer.start();
    uiControls.recordMovieBtn.textContent = "Stop Recording";
    uiControls.recordMovieBtn.style.backgroundColor = '#ffc107';
    uiControls.recordMovieBtn.disabled = false;
};

function finishCapture() {
    if (!capturer) return;
    capturer.stop();
    capturer.save();
    capturer = null;
    if (animationEnabledBeforeCapture !== null && animationEnabledBeforeCapture !== isAnimationEnabled) {
        isAnimationEnabled = animationEnabledBeforeCapture;
        uiControls.animateToggle.checked = animationEnabledBeforeCapture;
    }
    animationEnabledBeforeCapture = null;
    uiControls.recordMovieBtn.textContent = "Record Movie";
    uiControls.recordMovieBtn.style.backgroundColor = '';
    uiControls.recordMovieBtn.disabled = false;
}

function setCanvasSize() {
    const size = new THREE.Vector2();
    renderer.getSize(size);
    const stereoFactor = isStereoEnabled ? 2 : 1;
    let baseWidth = parseInt(uiControls.canvasWidth.value, 10);
    let baseHeight = parseInt(uiControls.canvasHeight.value, 10);
    if (isNaN(baseWidth) || baseWidth <= 0) {
        baseWidth = Math.max(1, Math.round(size.x / stereoFactor));
        uiControls.canvasWidth.value = baseWidth;
    }
    if (isNaN(baseHeight) || baseHeight <= 0) {
        baseHeight = Math.max(1, Math.round(size.y));
        uiControls.canvasHeight.value = baseHeight;
    }
    const finalWidth = baseWidth * stereoFactor;
    renderer.setSize(finalWidth, baseHeight);
    camera.aspect = baseWidth / baseHeight;
    camera.updateProjectionMatrix();
    uiControls.stereoOverlay.style.width = `${finalWidth}px`;
    uiControls.stereoOverlay.style.height = `${baseHeight}px`;
}

function renderScene(width, height) {
    if (isStereoEnabled) {
        stereoCamera.update(camera);
        renderer.setScissorTest(true);
        const leftCamera = isViewSwapped ? stereoCamera.cameraR : stereoCamera.cameraL;
        const rightCamera = isViewSwapped ? stereoCamera.cameraL : stereoCamera.cameraR;
        renderer.setScissor(0, 0, width / 2, height);
        renderer.setViewport(0, 0, width / 2, height);
        renderer.render(scene, leftCamera);
        renderer.setScissor(width / 2, 0, width / 2, height);
        renderer.setViewport(width / 2, 0, width / 2, height);
        renderer.render(scene, rightCamera);
        renderer.setScissorTest(false);
    } else {
        renderer.setViewport(0, 0, width, height);
        renderer.render(scene, camera);
    }
}

const animate = () => {
    requestAnimationFrame(animate);
    const now = performance.now();
    const elapsed = now - then;
    if (elapsed > fpsInterval) {
        then = now - (elapsed % fpsInterval);
        orbitControls.update();
        const size = new THREE.Vector2();
        renderer.getSize(size);
        const width = size.x;
        const height = size.y;
        const totalSteps = parseInt(uiControls.totalSteps.value);
        if (isAnimationEnabled && isDrawing && !isDrawingCancelled && currentStep < totalSteps) {
            const currentPositions = calculatePositionsAtStep(currentStep);

            if (drawStyle === 'connect') {
                const lineSegments = temporaryObjects[0];
                if(lineSegments) {
                    const positions = lineSegments.geometry.attributes.position.array;
                    const colors = lineSegments.geometry.attributes.color.array;
                    const numPlanets = planets.length;
                    const segmentsPerStep = (numPlanets * (numPlanets - 1)) / 2;
                    let segmentCountThisStep = 0;
                    const tempColor = new THREE.Color();
                    for (let j = 0; j < numPlanets; j++) {
                        for (let k = j + 1; k < numPlanets; k++) {
                            const pos1 = currentPositions[j];
                            const pos2 = currentPositions[k];
                            const index = (currentStep * segmentsPerStep + segmentCountThisStep) * 6;
                            if (pos1 && pos2 && index < positions.length) {
                                positions[index] = pos1.x;
                                positions[index+1] = pos1.y;
                                positions[index+2] = pos1.z;
                                positions[index+3] = pos2.x;
                                positions[index+4] = pos2.y;
                                positions[index+5] = pos2.z;
                                
                                tempColor.set(planets[j].color);
                                colors[index] = tempColor.r;
                                colors[index+1] = tempColor.g;
                                colors[index+2] = tempColor.b;
                                colors[index+3] = tempColor.r;
                                colors[index+4] = tempColor.g;
                                colors[index+5] = tempColor.b;

                                segmentCountThisStep++;
                            }
                        }
                    }
                    lineSegments.geometry.setDrawRange(0, (currentStep + 1) * segmentsPerStep * 2);
                    lineSegments.geometry.attributes.position.needsUpdate = true;
                    lineSegments.geometry.attributes.color.needsUpdate = true;
                }
            } else { // 'orbit' style
                planets.forEach((planet, p_idx) => {
                    const newPos = currentPositions[p_idx];
                    if (newPos) {
                        planet.sphereObject.position.set(newPos.x, newPos.y, newPos.z);
                        const positions = planet.lineObject.geometry.attributes.position.array;
                        const index = currentStep * 3;
                        if(index < positions.length) {
                            positions[index] = newPos.x;
                            positions[index + 1] = newPos.y;
                            positions[index + 2] = newPos.z;
                        }
                        planet.lineObject.geometry.setDrawRange(0, currentStep + 1);
                        planet.lineObject.geometry.attributes.position.needsUpdate = true;
                    }
                });
            }
            currentStep++;
            uiControls.progressBar.value = (currentStep / totalSteps) * 100;
            if (currentStep >= totalSteps) {
                isDrawing = false;
            }
        }
        if (capturer && !isDrawing && currentStep >= totalSteps) {
            finishCapture();
        }
        camera.fov = parseFloat(uiControls.fov.value);
        camera.focus = parseFloat(uiControls.focalDistance.value);
        camera.updateProjectionMatrix();
        stereoCamera.eyeSep = parseFloat(uiControls.eyeSeparation.value);
        uiControls.fovValue.textContent = camera.fov.toFixed(0);
        uiControls.focalValue.textContent = camera.focus.toFixed(0);
        uiControls.eyeSepValue.textContent = stereoCamera.eyeSep.toFixed(2);
        renderer.setClearColor(uiControls.backColor.value);
        renderScene(width, height);
        if (capturer && isDrawing) {
            capturer.capture(renderer.domElement);
        }
    }
};

// --- 6. INITIALIZATION AND EVENT LISTENERS ---
uiControls.applySizeBtn.addEventListener('click', setCanvasSize);
uiControls.planetSelector.addEventListener('input', (e) => {
    selectedPlanetIndex = parseInt(e.target.value);
    populateEditor();
});
uiControls.removePlanetBtn.addEventListener('click', () => {
    if (planets.length === 0) return;
    planets.splice(selectedPlanetIndex, 1);
    planets.forEach(p => {
        if (p.parent > selectedPlanetIndex) { p.parent -= 1; } else if (p.parent === selectedPlanetIndex) { p.parent = -1; }
    });
    if (selectedPlanetIndex >= planets.length) { selectedPlanetIndex = planets.length - 1; }
    if (planets.length === 0) { selectedPlanetIndex = 0; }
    updatePlanetUI();
});
uiControls.drawBtn.addEventListener('click', () => {
    if (isAnimationEnabled) {
        draw();
    } else {
        fullRender();
    }
});
uiControls.randomBtn.addEventListener('click', drawRandom);
uiControls.resetBtn.addEventListener('click', resetSystem);
uiControls.addPlanetBtn.addEventListener('click', addPlanet);
uiControls.stopBtn.addEventListener('click', () => {
    isDrawingCancelled = true;
    isDrawing = false;
    finishCapture();
});
uiControls.saveImageBtn.addEventListener('click', saveImage);
uiControls.recordMovieBtn.addEventListener('click', recordMovie);
uiControls.exportBtn.addEventListener('click', exportParams);
uiControls.importFile.addEventListener('change', importParams);
uiControls.stereoToggle.addEventListener('change', (e) => {
    isStereoEnabled = e.target.checked;
    uiControls.swapViewsBtn.disabled = !isStereoEnabled;
    uiControls.stereoOverlay.style.display = isStereoEnabled ? 'block' : 'none';
    setCanvasSize();
});
uiControls.swapViewsBtn.addEventListener('click', () => {
    if (!isStereoEnabled) return;
    isViewSwapped = !isViewSwapped;
});
uiControls.animateToggle.addEventListener('change', (e) => {
    isAnimationEnabled = e.target.checked;
});
uiControls.fpsSlider.addEventListener('input', (e) => {
    const fps = parseInt(e.target.value);
    uiControls.fpsValue.textContent = fps;
    fpsInterval = 1000 / fps;
});
uiControls.drawStyleSelector.addEventListener('change', (e) => {
    drawStyle = e.target.value;
    const isOrbit = drawStyle === 'orbit';
    sunMesh.visible = isOrbit;
    planets.forEach(p => {
        if (p.sphereObject) p.sphereObject.visible = isOrbit;
    });
});

// Initial setup on page load
createPlanetEditor();
drawRandom();
setCanvasSize();
animate();
