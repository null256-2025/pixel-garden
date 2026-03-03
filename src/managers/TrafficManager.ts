import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { SkeletonUtils } from 'three/examples/jsm/utils/SkeletonUtils.js';

interface CarData {
    pathIndex: number;
    t: number;      // 0.0 to 1.0 position on curve
    speed: number;  // Path traversal speed
    offset: number; // Lateral offset (lanes)
    color: THREE.Color;

    // New properties for FBX model
    model?: THREE.Object3D;
    wheels?: THREE.Object3D[];
}

export class TrafficManager {
    private scene: THREE.Scene;
    private maxCars: number;
    private paths: THREE.CatmullRomCurve3[] = [];
    private cars: CarData[] = [];

    // Master model loaded from FBX
    private masterModel: THREE.Object3D | null = null;
    private isReady = false;

    // For calculating movement
    private position = new THREE.Vector3();
    private tangent = new THREE.Vector3();
    private binormal = new THREE.Vector3();
    private up = new THREE.Vector3(0, 1, 0);

    // Color palette for cars
    private palette = [
        0xffffff, // White
        0xaaaaaa, // Silver
        0x222222, // Black
        0xaa0000, // Red
        0x0000aa, // Blue
        0x00aa00, // Green
        0xdddd00  // Yellow
    ];

    // Shared texture for wheels to show rotation
    private wheelTexture: THREE.CanvasTexture;

    constructor(scene: THREE.Scene, maxCars: number = 20) { // Reduced default max cars for separate meshes
        this.scene = scene;
        this.maxCars = maxCars;
        this.wheelTexture = this.createWheelTexture();
        this.loadModel();
    }

    private createWheelTexture(): THREE.CanvasTexture {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d')!;

        // Base color
        ctx.fillStyle = '#333333';
        ctx.fillRect(0, 0, 128, 128);

        // Draw stripes (like a pie chart) to make rotation obvious
        ctx.translate(64, 64);
        ctx.fillStyle = '#888888';
        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, 64, i * Math.PI / 2, (i + 0.5) * Math.PI / 2);
            ctx.lineTo(0, 0);
            ctx.fill();
        }

        const texture = new THREE.CanvasTexture(canvas);
        // Important for simple geometries mapping:
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    }

    private loadModel() {
        const loader = new FBXLoader();
        const carUrl = new URL('../public/models/sedan.fbx', import.meta.url).href;

        loader.load(carUrl, (fbx) => {
            // Apply scale to the FBX (adjust based on the specific model's original size)
            // Assuming Kenney assets, they usually need to be scaled down slightly for our tiny city
            fbx.scale.setScalar(0.005);

            // Adjust materials for night scene and enable shadows
            fbx.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;

                    if (child.material) {
                        try {
                            const mats = Array.isArray(child.material) ? child.material : [child.material];
                            mats.forEach(mat => {
                                // Basic cleanup for night lighting
                                mat.roughness = 0.4;
                                mat.metalness = 0.6;
                            });
                        } catch (e) { }
                    }
                }
            });

            this.masterModel = fbx;
            this.isReady = true;
            this.spawnInitialTraffic();
        }, undefined, (e) => console.error("Error loading sedan.fbx:", e));
    }

    private spawnInitialTraffic() {
        if (this.paths.length === 0) return;

        for (let i = 0; i < this.maxCars; i++) {
            const pathIndex = i % this.paths.length;
            this.spawnCar(pathIndex);
        }
    }

    public addPath(path: THREE.CatmullRomCurve3) {
        this.paths.push(path);
    }

    public spawnCar(pathIndex: number) {
        if (!this.isReady || !this.masterModel || this.cars.length >= this.maxCars || pathIndex >= this.paths.length) return;

        const colorHex = this.palette[Math.floor(Math.random() * this.palette.length)];
        const color = new THREE.Color(colorHex);

        const pathLength = this.paths[pathIndex].getLength();
        // Target speed: approx 1.5 to 3.0 units per second
        const unitsPerSecond = 1.5 + Math.random() * 1.5;
        const speed = unitsPerSecond / pathLength;

        // Spread cars slightly across the road
        const offset = (Math.random() - 0.5) * 1.5;

        const carData: CarData = {
            pathIndex,
            t: Math.random(), // Random starting position along the track
            speed,
            offset,
            color,
            wheels: []
        };

        // Clone the master model
        const clone = SkeletonUtils.clone(this.masterModel);

        // Find wheels and color the body
        clone.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                const name = child.name.toLowerCase();

                // Identify wheels to rotate them later
                if (name.includes('wheel') || name.includes('tire')) {
                    carData.wheels!.push(child);
                    // Apply the striped texture so rotation is visible
                    const wheelMat = new THREE.MeshStandardMaterial({
                        map: this.wheelTexture,
                        roughness: 0.8,
                        metalness: 0.2
                    });
                    child.material = wheelMat;
                }

                // Try to color the main body (heuristics: names like 'body', 'frame', or just color everything not a wheel/window)
                if (!name.includes('wheel') && !name.includes('tire') && !name.includes('glass') && !name.includes('window')) {
                    if (child.material) {
                        const mat = child.material.clone() as THREE.MeshStandardMaterial;
                        mat.color.set(color);
                        child.material = mat;
                    }
                }
            }
        });

        this.scene.add(clone);
        carData.model = clone;

        this.cars.push(carData);
    }

    public update(dt: number) {
        if (this.paths.length === 0 || this.cars.length === 0) return;

        for (let i = 0; i < this.cars.length; i++) {
            const car = this.cars[i];
            const path = this.paths[car.pathIndex];

            // Update path parameter t
            car.t += car.speed * dt;
            if (car.t >= 1.0) {
                car.t -= 1.0;
            }

            path.getPointAt(car.t, this.position);
            path.getTangentAt(car.t, this.tangent);
            this.binormal.crossVectors(this.up, this.tangent).normalize();
            this.position.addScaledVector(this.binormal, car.offset);

            if (car.model) {
                car.model.position.copy(this.position);

                const lookAtTarget = this.position.clone().add(this.tangent);
                lookAtTarget.y = this.position.y;
                car.model.lookAt(lookAtTarget);

                // Rotate wheels!
                if (car.wheels && car.wheels.length > 0) {
                    // Multiply speed by dt and a factor to look like wheels rolling
                    const rotationAmount = car.speed * 200 * dt;
                    car.wheels.forEach(wheel => {
                        // Assuming wheels rotate on the X axis locally
                        wheel.rotation.x -= rotationAmount;
                    });
                }
            }
        }
    }
}
