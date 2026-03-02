import * as THREE from 'three';
import { TerrainSculptor } from './TerrainSculptor';
import { makeStreetLight, makeGroundDetail } from '../objects/StreetProps';
import { makeNeonSign } from '../objects/NeonSigns';
import {
    makeTallTower, makeSlimTower, makeWideLow, makeMediumA, makeMediumB,
    makeShopFront, makeOfficeBlock, makeApartment, makeMiniBox, makeCornerBldg
} from '../objects/Buildings';
import { SpawnManager } from './SpawnManager';
import { NeonManager } from '../managers/NeonManager';
import { CommandHistory } from './CommandHistory';

export type CityToolType = 'StreetLight' | 'NeonSign' | 'TallTower' | 'SlimTower' | 'WideLow' | 'MediumA' | 'MediumB' | 'ShopFront' | 'OfficeBlock' | 'Apartment' | 'MiniBox' | 'CornerBldg';

export class NaturePlacer {
    private raycaster = new THREE.Raycaster();
    private mouse = new THREE.Vector2();
    private currentTool: CityToolType | null = null;
    private currentRotation: number = 0;

    private groundMesh: THREE.Object3D | null = null;

    // Track placed objects so they can ride the terrain
    private trackingObjects: THREE.Object3D[] = [];

    // Group cursor to show footprint
    private cursorGroup: THREE.Group;
    private cursorFootprint: THREE.Mesh;

    constructor(
        private camera: THREE.Camera,
        private scene: THREE.Scene,
        private domElement: HTMLElement,
        private terrainSculptor: TerrainSculptor,
        private spawnManager: SpawnManager,
        private neonManager: NeonManager
    ) {
        // Setup placement cursor base footprint
        const footprintGeo = new THREE.BoxGeometry(1, 0.05, 1);
        const cursorMat = new THREE.MeshBasicMaterial({ color: 0x6644ff, transparent: true, opacity: 0.5, depthTest: false });
        this.cursorFootprint = new THREE.Mesh(footprintGeo, cursorMat);
        this.cursorFootprint.position.y = 0;

        this.cursorGroup = new THREE.Group();
        this.cursorGroup.add(this.cursorFootprint);
        this.cursorGroup.visible = false;
        this.cursorGroup.renderOrder = 999;
        this.scene.add(this.cursorGroup);

        domElement.addEventListener('pointerdown', this.onPointerDown.bind(this));
        domElement.addEventListener('pointermove', this.onPointerMove.bind(this));

        // Listen for keyboard rotation (R key)
        document.addEventListener('keydown', (e) => {
            if (this.currentTool && e.key.toLowerCase() === 'r') {
                this.currentRotation -= Math.PI / 4; // Rotate 45 degrees
                this.cursorGroup.rotation.y = this.currentRotation;
            }
        });

        // Listen for terrain changes to adjust our objects
        terrainSculptor.onTerrainUpdate((sculptor) => {
            this.updateObjectHeights(sculptor);
        });
    }

    public initTracking(trackingArray: THREE.Object3D[]) {
        this.trackingObjects = trackingArray;
        // Pass connection up to spawn manager so spawning binds them
        this.spawnManager.registerTrackingArray(this.trackingObjects);
    }

    public setGround(ground: THREE.Object3D) {
        this.groundMesh = ground;
    }

    public setTool(tool: CityToolType | null) {
        this.currentTool = tool;
        if (!tool) {
            this.cursorGroup.visible = false;
        } else {
            this.updateCursorSize(tool);
        }
    }

    private updateCursorSize(tool: CityToolType) {
        let w = 1, d = 1;
        switch (tool) {
            case 'TallTower': w = 3.0; d = 3.0; break;
            case 'SlimTower': w = 1.5; d = 1.5; break;
            case 'WideLow': w = 4.0; d = 2.5; break;
            case 'MediumA': w = 2.0; d = 2.0; break;
            case 'MediumB': w = 2.5; d = 2.0; break;
            case 'ShopFront': w = 3.0; d = 2.0; break;
            case 'OfficeBlock': w = 2.5; d = 2.5; break;
            case 'Apartment': w = 2.0; d = 3.0; break;
            case 'MiniBox': w = 1.5; d = 1.0; break;
            case 'CornerBldg': w = 2.0; d = 2.0; break;
            case 'StreetLight': w = 0.4; d = 0.4; break;
            case 'NeonSign': w = 0.8; d = 0.8; break;
        }

        // Recreate geometry to match the new size
        this.cursorFootprint.geometry.dispose();
        this.cursorFootprint.geometry = new THREE.BoxGeometry(w, 0.05, d);
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
            this.cursorGroup.visible = false;
            return;
        }

        this.updateMouse(event);
        const hitPoint = this.getIntersection();

        if (hitPoint) {
            this.cursorGroup.visible = true;
            this.cursorGroup.position.copy(hitPoint);
            this.cursorGroup.rotation.y = this.currentRotation;
            // Snap to exact ground height to avoid z-fighting or floating
            this.cursorGroup.position.y = this.terrainSculptor.getGroundHeightAtXZ(hitPoint.x, hitPoint.z) + 0.05;
        } else {
            this.cursorGroup.visible = false;
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

        if (this.currentTool === 'StreetLight') {
            // エディタで配置する街灯は常に 'medium' サイズで統一する
            obj = makeStreetLight(this.scene, pos.x, pos.z, 'medium', 0, this.neonManager);
            obj.position.copy(pos);
        } else if (this.currentTool === 'NeonSign') {
            const signW = 0.5 + Math.random() * 0.4;
            const signH = 0.3 + Math.random() * 0.4;
            obj = makeNeonSign(this.scene, pos.x, pos.z, signW, signH, Math.random() * Math.PI * 2, this.neonManager);
            obj.position.copy(pos);
        } else if (this.currentTool === 'TallTower') {
            obj = makeTallTower(this.scene, pos.x, pos.z, this.neonManager);
        } else if (this.currentTool === 'SlimTower') {
            obj = makeSlimTower(this.scene, pos.x, pos.z, this.neonManager);
        } else if (this.currentTool === 'WideLow') {
            obj = makeWideLow(this.scene, pos.x, pos.z, this.neonManager);
        } else if (this.currentTool === 'MediumA') {
            obj = makeMediumA(this.scene, pos.x, pos.z, this.neonManager);
        } else if (this.currentTool === 'MediumB') {
            obj = makeMediumB(this.scene, pos.x, pos.z, this.neonManager);
        } else if (this.currentTool === 'ShopFront') {
            obj = makeShopFront(this.scene, pos.x, pos.z, this.neonManager);
        } else if (this.currentTool === 'OfficeBlock') {
            obj = makeOfficeBlock(this.scene, pos.x, pos.z, this.neonManager);
        } else if (this.currentTool === 'Apartment') {
            obj = makeApartment(this.scene, pos.x, pos.z, this.neonManager);
        } else if (this.currentTool === 'MiniBox') {
            obj = makeMiniBox(this.scene, pos.x, pos.z, this.neonManager);
        } else if (this.currentTool === 'CornerBldg') {
            obj = makeCornerBldg(this.scene, pos.x, pos.z, this.neonManager);
        }

        if (obj) {
            // Update position to conform exactly to pointer
            obj.position.copy(pos);
            obj.rotation.y = this.currentRotation;
            this.trackingObjects.push(obj);

            const placedObj = obj;

            CommandHistory.push(() => {
                this.scene.remove(placedObj);
                const idx = this.trackingObjects.indexOf(placedObj);
                if (idx !== -1) this.trackingObjects.splice(idx, 1);
            });
        }
    }

    private updateObjectHeights(sculptor: TerrainSculptor) {
        this.trackingObjects.forEach(obj => {
            const newY = sculptor.getGroundHeightAtXZ(obj.position.x, obj.position.z);
            obj.position.y = newY;
        });
    }

    public clearAll() {
        this.trackingObjects.forEach(obj => {
            this.scene.remove(obj);
        });
        this.trackingObjects = [];
        this.cursorGroup.visible = false;
    }
}
