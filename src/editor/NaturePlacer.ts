import * as THREE from 'three';
import { RockGenerator } from './generators/RockGenerator';
import { TerrainSculptor } from './TerrainSculptor';
import { makeTree, makeGrassPatch } from '../objects/Trees';
import { makeSeed } from '../objects/Seed';
import { GrowthManager } from './GrowthManager';
import { CommandHistory } from './CommandHistory';

export type NatureToolType = 'Tree' | 'Seed' | 'Grass' | 'Rock';

export class NaturePlacer {
    private raycaster = new THREE.Raycaster();
    private mouse = new THREE.Vector2();
    private currentTool: NatureToolType | null = null;

    private groundMesh: THREE.Object3D | null = null;
    private rockGenerator: RockGenerator;

    // Track placed objects so they can ride the terrain
    private trackingObjects: THREE.Object3D[] = [];

    // Simple cursor mesh to show where we are placing
    private cursorMesh: THREE.Mesh;

    constructor(
        private camera: THREE.Camera,
        private scene: THREE.Scene,
        private domElement: HTMLElement,
        private terrainSculptor: TerrainSculptor,
        private growthManager: GrowthManager
    ) {
        this.rockGenerator = new RockGenerator(scene);

        // Setup placement cursor
        const cursorGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.05, 12);
        const cursorMat = new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.5, depthTest: false });
        this.cursorMesh = new THREE.Mesh(cursorGeo, cursorMat);
        this.cursorMesh.visible = false;
        this.cursorMesh.renderOrder = 999;
        this.scene.add(this.cursorMesh);

        domElement.addEventListener('pointerdown', this.onPointerDown.bind(this));
        domElement.addEventListener('pointermove', this.onPointerMove.bind(this));

        // Listen for terrain changes to adjust our objects
        terrainSculptor.onTerrainUpdate((sculptor) => {
            this.updateObjectHeights(sculptor);
        });
    }

    public initTracking(trackingArray: THREE.Object3D[]) {
        this.trackingObjects = trackingArray;
        // Pass connection up to growth manager so spawning flowerbeds binds them
        this.growthManager.registerTrackingArray(this.trackingObjects);
    }

    public setGround(ground: THREE.Object3D) {
        this.groundMesh = ground;
    }

    public setTool(tool: NatureToolType | null) {
        this.currentTool = tool;
        if (!tool) {
            this.cursorMesh.visible = false;
        }
    }

    private updateMouse(event: PointerEvent) {
        const rect = this.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    private getIntersection(): THREE.Vector3 | null {
        if (!this.groundMesh) return null;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObject(this.groundMesh, false);

        if (intersects.length > 0) {
            return intersects[0].point;
        }
        return null;
    }

    private onPointerMove(event: PointerEvent) {
        if (!this.currentTool) {
            this.cursorMesh.visible = false;
            return;
        }

        this.updateMouse(event);
        const hitPoint = this.getIntersection();

        if (hitPoint) {
            this.cursorMesh.visible = true;
            this.cursorMesh.position.copy(hitPoint);
            // Snap to exact ground height to avoid z-fighting or floating
            this.cursorMesh.position.y = this.terrainSculptor.getGroundHeightAtXZ(hitPoint.x, hitPoint.z) + 0.05;
        } else {
            this.cursorMesh.visible = false;
        }
    }

    private onPointerDown(event: PointerEvent) {
        if (event.button !== 0 || !this.currentTool) return;
        this.updateMouse(event);
        const hitPoint = this.getIntersection();

        if (hitPoint) {
            // Re-calculate exactly on the terrain sculpt height
            hitPoint.y = this.terrainSculptor.getGroundHeightAtXZ(hitPoint.x, hitPoint.z);
            this.placeObject(hitPoint);
        }
    }

    private placeObject(pos: THREE.Vector3) {
        let obj: THREE.Object3D | null = null;

        if (this.currentTool === 'Rock') {
            obj = this.rockGenerator.generate(pos);
        } else if (this.currentTool === 'Tree') {
            // Randomly choose small or medium size for placed trees
            const size = Math.random() > 0.5 ? 'small' : 'medium';
            obj = makeTree(this.scene, pos.x, pos.z, size);
            obj.position.copy(pos); // Ensure Y is set too
        } else if (this.currentTool === 'Grass') {
            obj = makeGrassPatch(this.scene, pos.x, pos.z);
            obj.position.copy(pos); // Ensure Y is set too
        } else if (this.currentTool === 'Seed') {
            obj = makeSeed(this.scene, pos.x, pos.z);
            obj.position.copy(pos);
            this.growthManager.addSeed(obj as THREE.Mesh);
        }

        if (obj) {
            this.trackingObjects.push(obj);

            const placedObj = obj;
            const isSeed = this.currentTool === 'Seed';

            CommandHistory.push(() => {
                if (isSeed) {
                    this.growthManager.removeSeed(placedObj);
                } else {
                    this.scene.remove(placedObj);
                    const idx = this.trackingObjects.indexOf(placedObj);
                    if (idx !== -1) this.trackingObjects.splice(idx, 1);
                }
            });
        }
    }

    private updateObjectHeights(sculptor: TerrainSculptor) {
        this.trackingObjects.forEach(obj => {
            // Only update height, assume X and Z are locked
            const newY = sculptor.getGroundHeightAtXZ(obj.position.x, obj.position.z);

            // For rocks, keep them slightly buried based on their creation logic offset, 
            // but for now simple Y overwrite works for bounding boxes.
            if ('geometry' in obj && (obj as THREE.Mesh).geometry instanceof THREE.IcosahedronGeometry) {
                obj.position.y = newY + 0.06; // Approximate rock embed
            } else {
                obj.position.y = newY;
            }
        });
    }

    public clearAll() {
        this.trackingObjects.forEach(obj => {
            this.scene.remove(obj);
        });
        this.trackingObjects = [];
        this.cursorMesh.visible = false;
    }
}
