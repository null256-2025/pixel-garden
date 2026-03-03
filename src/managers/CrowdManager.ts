import * as THREE from 'three';

import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { SkeletonUtils } from 'three/examples/jsm/utils/SkeletonUtils.js';

interface CrowdData {
    pathIndex: number;
    t: number;      // 0.0 to 1.0 position on curve
    speed: number;  // Path traversal speed
    offset: number; // Lateral offset (sidewalk)

    // New properties for animated characters
    model?: THREE.Object3D;
    mixer?: THREE.AnimationMixer;
    walkAction?: THREE.AnimationAction;
    idleAction?: THREE.AnimationAction;
}

export class CrowdManager {
    private scene: THREE.Scene;
    private maxPeople: number;
    private paths: THREE.CatmullRomCurve3[] = [];
    private people: CrowdData[] = [];

    // Master model loaded from FBX
    private masterModel: THREE.Object3D | null = null;
    private walkClip: THREE.AnimationClip | null = null;
    private idleClip: THREE.AnimationClip | null = null;
    private isReady = false;

    // For calculating movement
    private position = new THREE.Vector3();
    private tangent = new THREE.Vector3();
    private binormal = new THREE.Vector3();
    private up = new THREE.Vector3(0, 1, 0);

    constructor(scene: THREE.Scene, maxPeople: number = 50) {
        this.scene = scene;
        this.maxPeople = maxPeople;
        this.loadModels();
    }

    private loadModels() {
        const loader = new FBXLoader();

        const idleUrl = new URL('../public/models/Idle.fbx', import.meta.url).href;
        const walkUrl = new URL('../public/models/Walking.fbx', import.meta.url).href;

        // 1. Load the Idle model (provides the base mesh, skeleton, and Idle animation)
        loader.load(idleUrl, (idleFbx) => {
            // Apply scale to the FBX (Mixamo models usually need scaling down)
            // 0.003 fits the "tiny pixel city" scale much better than 0.01
            idleFbx.scale.setScalar(0.003);

            // Adjust materials for night scene
            idleFbx.traverse((child) => {
                if (child instanceof THREE.Mesh || child instanceof THREE.SkinnedMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;

                    if (child.material) {
                        try {
                            const mats = Array.isArray(child.material) ? child.material : [child.material];
                            mats.forEach(mat => {
                                // Convert to StandardMaterial if it's Phong, or just tweak it
                                mat.roughness = 0.8;
                                mat.metalness = 0.1;
                                // Remove emissive entirely to stop the glowing Bloom effect
                                mat.emissive.setHex(0x000000);
                            });
                        } catch (e) { }
                    }
                }
            });

            this.masterModel = idleFbx;
            if (idleFbx.animations.length > 0) {
                this.idleClip = idleFbx.animations[0];
            }

            // 2. Load the Walking animation
            loader.load(walkUrl, (walkFbx) => {
                if (walkFbx.animations.length > 0) {
                    this.walkClip = walkFbx.animations[0];
                }

                this.isReady = true;
                this.spawnInitialCrowd();
            }, undefined, (e) => console.error("Error loading Walking.fbx:", e));

        }, undefined, (e) => console.error("Error loading Idle.fbx:", e));
    }

    private spawnInitialCrowd() {
        // Spawn up to maxPeople along available paths
        if (this.paths.length === 0) return;

        for (let i = 0; i < this.maxPeople; i++) {
            const pathIndex = i % this.paths.length;
            this.spawnPerson(pathIndex);
        }
    }

    public addPath(path: THREE.CatmullRomCurve3) {
        this.paths.push(path);
    }

    public spawnPerson(pathIndex: number) {
        if (!this.isReady || !this.masterModel || this.people.length >= this.maxPeople || pathIndex >= this.paths.length) return;

        const pathLength = this.paths[pathIndex].getLength();
        // Target speed: walking pace.
        const unitsPerSecond = 0.5 + Math.random() * 0.4;
        const speed = unitsPerSecond / pathLength;
        const offset = (Math.random() - 0.5) * 1.6;

        const personData: CrowdData = {
            pathIndex,
            t: Math.random(), // Random starting position
            speed,
            offset
        };

        // Clone the master model (skeleton and mesh)
        const clone = SkeletonUtils.clone(this.masterModel);

        // Randomize clothing color variation
        clone.traverse((child) => {
            if (child instanceof THREE.SkinnedMesh && child.material) {
                const mat = child.material.clone() as THREE.MeshStandardMaterial;
                // Tint the color slightly to add variety
                const hueShift = Math.random() * 0.2 - 0.1;
                const hsl = { h: 0, s: 0, l: 0 };
                mat.color.getHSL(hsl);
                mat.color.setHSL(hsl.h + hueShift, hsl.s * (0.8 + Math.random() * 0.4), hsl.l);
                child.material = mat;
            }
        });

        this.scene.add(clone);
        personData.model = clone;

        // Set up animations
        const mixer = new THREE.AnimationMixer(clone);
        personData.mixer = mixer;

        if (this.walkClip) {
            personData.walkAction = mixer.clipAction(this.walkClip);
            personData.walkAction.play();
            // Desync animations so they don't march in lockstep
            personData.walkAction.time = Math.random() * this.walkClip.duration;
            // Adjust animation speed to match movement speed
            personData.walkAction.timeScale = unitsPerSecond * 1.5;
        }

        if (this.idleClip) {
            personData.idleAction = mixer.clipAction(this.idleClip);
            // We stop idle for now, play walk
            personData.idleAction.stop();
        }

        this.people.push(personData);
    }

    public update(dt: number) {
        if (this.paths.length === 0 || this.people.length === 0) return;

        for (let i = 0; i < this.people.length; i++) {
            const person = this.people[i];
            const path = this.paths[person.pathIndex];

            // Update path parameter t
            person.t += person.speed * dt;
            if (person.t >= 1.0) {
                person.t -= 1.0;
            }

            path.getPointAt(person.t, this.position);
            path.getTangentAt(person.t, this.tangent);
            this.binormal.crossVectors(this.up, this.tangent).normalize();
            this.position.addScaledVector(this.binormal, person.offset);

            if (person.model) {
                person.model.position.copy(this.position);

                const lookAtTarget = this.position.clone().add(this.tangent);
                lookAtTarget.y = this.position.y;
                person.model.lookAt(lookAtTarget);
            }

            if (person.mixer) {
                person.mixer.update(dt);
            }
        }
    }
}
