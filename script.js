import * as CANNON from "https://cdn.skypack.dev/cannon-es";
import * as THREE from "three";
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";
import GUI from "https://cdn.jsdelivr.net/npm/lil-gui@0.18.2/+esm"

const containerEl = document.querySelector(".container");
const canvasEl = document.querySelector("#canvas");
const π = Math.PI;
const ε = 1e-3;

let renderer, scene, camera, diceMesh, physicsRender, simulation;
let simulationOn = true;
let currentResult = [0, 0];

const params = {

    // dice
    segments: 40,
    edgeRadius: .08,
    notchRadius: .15,
    notchDepth: .17,

    // physics
    restitution: .3,
    friction: .1,

    // ux
    diceNumber: 2,
    desiredResult: 7,
    throw: throwMe,
};

function throwMe() {
    clearPreviousDice();
    for (let i = 0; i < params.diceNumber; i++) {
        diceArray.push(createDice());
        addDiceEvents(diceArray[i], i);
    }
    simulationOn = true;
    throwDice();
}


const diceArray = [];
const floorPlanesArray = [];
let throwBtn;

const isDiff = (diff) => Math.abs(diff) < ε;
window.addEventListener("resize", updateSceneSize);
window.addEventListener('DOMContentLoaded', init);
window.addEventListener("click", () => {});

async function init() {
    initPhysics();
    initScene();
    createFloor();
    createControls();

    throwMe();
    render();
}

function clearPreviousDice() {
    diceArray.forEach(d => {
        scene.remove(d.mesh);
        physicsRender.removeBody(d.body[0]);
        simulation.removeBody(d.body[1]);
    });
    diceArray.length = 0;
}

function initScene() {
    renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        canvas: canvasEl
    });
    renderer.shadowMap.enabled = true
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(45, containerEl.clientWidth / containerEl.clientHeight, .1, 100)
    camera.position.set(0, 9, 12);
    camera.lookAt(0, 4, 0);

    updateSceneSize();

    const ambientLight = new THREE.AmbientLight(0xffffff, 1);
    scene.add(ambientLight);

    const light = new THREE.PointLight(0xffffff, 1000.);
    light.position.set(10, 20, 5);
    light.castShadow = true;
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;
    scene.add(light);
}

function initPhysics() {

    const gravity = new CANNON.Vec3(0, -50, 0);
    const allowSleep = true;
    physicsRender = new CANNON.World({
        allowSleep, gravity
    })
    simulation = new CANNON.World({
        allowSleep, gravity
    })
    physicsRender.defaultContactMaterial.restitution = params.restitution;
    simulation.defaultContactMaterial.restitution = params.restitution;
    physicsRender.defaultContactMaterial.friction = params.friction;
    simulation.defaultContactMaterial.friction = params.friction;

}

function createFloor() {
    for (let i = 0; i < 4; i++) {

        const body = new CANNON.Body({
            type: CANNON.Body.STATIC,
            shape: new CANNON.Plane(),
        });
        physicsRender.addBody(body);
        simulation.addBody(body);

        let mesh;
        if (i === 0) {
            mesh = new THREE.Mesh(
                new THREE.PlaneGeometry(100, 100, 100, 100),
                new THREE.ShadowMaterial({
                    opacity: .1
                })
            )
            scene.add(mesh);
            mesh.receiveShadow = true;
        }

        floorPlanesArray.push({
            body, mesh
        })
    }

    floorPositionUpdate();
}

function floorPositionUpdate() {
    floorPlanesArray.forEach((f, fIdx) => {
        if (fIdx === 0) {
            f.body.position.y = 0;
            f.body.quaternion.setFromEuler(-.5 * π, 0, 0);
        } else if (fIdx === 1) {
            f.body.quaternion.setFromEuler(0, .5 * π, 0);
            f.body.position.x = -6 * containerEl.clientWidth / containerEl.clientHeight;
        } else if (fIdx === 2) {
            f.body.quaternion.setFromEuler(0, -.5 * π, 0);
            f.body.position.x = 6 * containerEl.clientWidth / containerEl.clientHeight;
        } else if (fIdx === 3) {
            f.body.quaternion.setFromEuler(0, π, 0);
            f.body.position.z = 3;
        }

        if (f.mesh) {
            f.mesh.position.copy(f.body.position);
            f.mesh.quaternion.copy(f.body.quaternion);
        }
    })
}

function createDiceMesh() {
    const boxMaterialOuter = new THREE.MeshStandardMaterial({
        color: 0xffffff,
    })
    const boxMaterialInner = new THREE.MeshStandardMaterial({
        color: 0x000000,
        roughness: 0,
        metalness: 1,
    })

    const g = new THREE.Group();
    const innerSide = 1 - params.edgeRadius;
    const innerMesh = new THREE.Mesh(
        new THREE.BoxGeometry(innerSide, innerSide, innerSide),
        boxMaterialInner
    );
    const outerMesh = new THREE.Mesh(
        createBoxGeometry(),
        boxMaterialOuter
    );
    outerMesh.castShadow = true;
    g.add(innerMesh, outerMesh);

    return g;
}

function createDice() {
    diceMesh = createDiceMesh();
    const mesh = diceMesh.clone();
    scene.add(mesh);

    const shape = new CANNON.Box(new CANNON.Vec3(.5, .5, .5));
    const mass = 1;
    const sleepTimeLimit = .02;

    const body = new CANNON.Body({
        mass, shape, sleepTimeLimit
    });
    physicsRender.addBody(body);

    const simulationBody = new CANNON.Body({
        mass, shape, sleepTimeLimit
    });
    simulation.addBody(simulationBody);

    return {
        mesh,
        body: [body, simulationBody],
        startPos: [null, null, null]
    };
}

function createBoxGeometry() {

    let boxGeometry = new THREE.BoxGeometry(1, 1, 1, params.segments, params.segments, params.segments);

    const positionAttr = boxGeometry.attributes.position;
    const subCubeHalfSize = .5 - params.edgeRadius;

    const notchWave = (v) => {
        v = (1 / params.notchRadius) * v;
        v = π * Math.max(-1, Math.min(1, v));
        return params.notchDepth * (Math.cos(v) + 1.);
    }
    const notch = (pos) => notchWave(pos[0]) * notchWave(pos[1]);

    for (let i = 0; i < positionAttr.count; i++) {

        let position = new THREE.Vector3().fromBufferAttribute(positionAttr, i);
        const subCube = new THREE.Vector3(Math.sign(position.x), Math.sign(position.y), Math.sign(position.z)).multiplyScalar(subCubeHalfSize);
        const addition = new THREE.Vector3().subVectors(position, subCube);

        if (Math.abs(position.x) > subCubeHalfSize && Math.abs(position.y) > subCubeHalfSize && Math.abs(position.z) > subCubeHalfSize) {
            addition.normalize().multiplyScalar(params.edgeRadius);
            position = subCube.add(addition);
        } else if (Math.abs(position.x) > subCubeHalfSize && Math.abs(position.y) > subCubeHalfSize) {
            addition.z = 0;
            addition.normalize().multiplyScalar(params.edgeRadius);
            position.x = subCube.x + addition.x;
            position.y = subCube.y + addition.y;
        } else if (Math.abs(position.x) > subCubeHalfSize && Math.abs(position.z) > subCubeHalfSize) {
            addition.y = 0;
            addition.normalize().multiplyScalar(params.edgeRadius);
            position.x = subCube.x + addition.x;
            position.z = subCube.z + addition.z;
        } else if (Math.abs(position.y) > subCubeHalfSize && Math.abs(position.z) > subCubeHalfSize) {
            addition.x = 0;
            addition.normalize().multiplyScalar(params.edgeRadius);
            position.y = subCube.y + addition.y;
            position.z = subCube.z + addition.z;
        }

        const offset = .23;
        if (position.y === .5) {
            position.y -= notch([position.x, position.z]);
        } else if (position.x === .5) {
            position.x -= notch([position.y + offset, position.z + offset]);
            position.x -= notch([position.y - offset, position.z - offset]);
        } else if (position.z === .5) {
            position.z -= notch([position.x - offset, position.y + offset]);
            position.z -= notch([position.x, position.y]);
            position.z -= notch([position.x + offset, position.y - offset]);
        } else if (position.z === -.5) {
            position.z += notch([position.x + offset, position.y + offset]);
            position.z += notch([position.x + offset, position.y - offset]);
            position.z += notch([position.x - offset, position.y + offset]);
            position.z += notch([position.x - offset, position.y - offset]);
        } else if (position.x === -.5) {
            position.x += notch([position.y + offset, position.z + offset]);
            position.x += notch([position.y + offset, position.z - offset]);
            position.x += notch([position.y, position.z]);
            position.x += notch([position.y - offset, position.z + offset]);
            position.x += notch([position.y - offset, position.z - offset]);
        } else if (position.y === -.5) {
            position.y += notch([position.x + offset, position.z + offset]);
            position.y += notch([position.x + offset, position.z]);
            position.y += notch([position.x + offset, position.z - offset]);
            position.y += notch([position.x - offset, position.z + offset]);
            position.y += notch([position.x - offset, position.z]);
            position.y += notch([position.x - offset, position.z - offset]);
        }

        positionAttr.setXYZ(i, position.x, position.y, position.z);
    }

    boxGeometry.deleteAttribute("normal");
    boxGeometry.deleteAttribute("uv");
    boxGeometry = BufferGeometryUtils.mergeVertices(boxGeometry);
    boxGeometry.computeVertexNormals();

    return boxGeometry;
}

function addDiceEvents(dice, diceIdx) {
    dice.body.forEach(b => {
        b.addEventListener("sleep", (e) => {
            b.allowSleep = false;

            if (simulationOn) {
                const euler = new CANNON.Vec3();
                e.target.quaternion.toEuler(euler);

                if (isDiff(euler.z - 0)) {
                    if (isDiff(euler.x - 0)) 
                        currentResult[diceIdx] = 1;
                    else if (isDiff(euler.x - π/2)) 
                        currentResult[diceIdx] = 4;
                    else if (isDiff(euler.x + π/2)) 
                        currentResult[diceIdx] = 3;
                    else if (isDiff(euler.x - π) || isDiff(euler.x + π))
                        currentResult[diceIdx] = 6;
                    else {
                        b.allowSleep = true;
                        throwDice();
                    }
                } else if (isDiff(euler.z - π/2)) 
                    currentResult[diceIdx] = 2;
                else if (isDiff(euler.z + π/2))
                    currentResult[diceIdx] = 5;
                else {
                    b.allowSleep = true;
                    throwDice();
                }

                const thisDiceRes = currentResult[diceIdx];
                const currentSum = currentResult.reduce((a, v) => a + v, 0);
                
                switch (params.diceNumber) {
                    case 1:
                        if (thisDiceRes == params.desiredResult) simulationOn = false;
                        throwDice();
                        break;
                    case 2:
                        const anotherDiceRes = currentResult[diceIdx ? 0 : 1];
                        if (anotherDiceRes === 0 && thisDiceRes >= params.desiredResult) {
                            throwDice();
                        } else if (anotherDiceRes !== 0) {
                            if (params.desiredResult === currentSum) {
                                simulationOn = false;
                                throwBtn.innerHTML = "throw!";
                            }
                            throwDice();
                        }
                        break;
                    default:
                        const allNonZero = currentResult.every(v => v !== 0);
                        const someZero = currentResult.some(v => v === 0);
                        if (someZero && currentSum >= params.desiredResult) {
                            throwDice();
                        } else if (allNonZero) {
                            if (params.desiredResult === currentSum) {
                                simulationOn = false;
                                throwBtn.innerHTML = "throw!";
                            }
                            throwDice();
                        }
                        break;
                }
            }
        });
    })
}

function render() {
    if (simulationOn) {
        simulation.step(1 / 60, 5000, 60);
    } else {
        physicsRender.fixedStep();
        for (const dice of diceArray) {
            dice.mesh.position.copy(dice.body[0].position)
            dice.mesh.quaternion.copy(dice.body[0].quaternion)
        }
        renderer.render(scene, camera);
    }
    requestAnimationFrame(render);
}

function updateSceneSize() {
    camera.aspect = containerEl.clientWidth / containerEl.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(containerEl.clientWidth, containerEl.clientHeight);
    floorPositionUpdate();
}

function array(N) {
    switch (N) {
        case 1:
            return [0];
        case 2:
            return [0, 0];
        case 3:
            return [0, 0, 0];
        case 4:
            return [0, 0, 0, 0];
        case 5:
            return [0, 0, 0, 0, 0];
        case 6:
            return [0, 0, 0, 0, 0, 0];
        default:
            return [0];
    }
}

function throwDice() {
    const quaternion = new THREE.Quaternion();

    if (simulationOn) {
        throwBtn.innerHTML = "calculating a throw...";
        currentResult = array(params.diceNumber);
        diceArray.forEach(d => { d.startPos = [Math.random(), Math.random(), Math.random()]});
    }

    diceArray.forEach((d, dIdx) => {
        quaternion.setFromEuler(new THREE.Euler(2 * π * d.startPos[0], 0, 2 * π * d.startPos[1]));
        const force = 6 + 3 * d.startPos[2];
        const b = simulationOn ? d.body[1] : d.body[0];
        b.position = new CANNON.Vec3(3, 5 + dIdx, 2);
        b.velocity.setZero();
        b.angularVelocity.setZero();
        b.applyImpulse(
            new CANNON.Vec3(-force, force, 0),
            new CANNON.Vec3(0, 0, -.5)
        );
        b.quaternion.copy(quaternion);
        b.allowSleep = true;
    });

}

function createControls() {
    const gui = new GUI();
    
    const resultControl = gui
        .add(params, "desiredResult", params.diceNumber, params.diceNumber * 6, 1)
        .name("result")

    const diceControl = gui
        .add(params, "diceNumber", 1, 5, 1)
        .name("dice number")

    diceControl.onChange((value) => {
        resultControl.min(value); // Minimum possible result (2 for 2 dice)
        resultControl.max(value * 6); // Maximum possible result (6 per die)
        params.desiredResult = Math.min(params.desiredResult, value * 6);
        params.diceNumber = value;
        resultControl.updateDisplay();
    });

    const btnControl = gui
        .add(params, "throw")
        .name("throw!")

    throwBtn = btnControl.domElement.querySelector("button > .name");
}