import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { PhysicsWorld } from '../physics/PhysicsWorld';

export class DestroyerTool {
    private raycaster = new THREE.Raycaster();
    private mouse = new THREE.Vector2();
    private boundOnPointerDown = this.onPointerDown.bind(this);

    constructor(
        private camera: THREE.Camera,
        private scene: THREE.Scene,
        private domElement: HTMLElement,
        private physics: PhysicsWorld,
        private trackingObjects: THREE.Object3D[]
    ) { }

    public attachEvents() {
        this.domElement.addEventListener('pointerdown', this.boundOnPointerDown);
    }

    public detachEvents() {
        this.domElement.removeEventListener('pointerdown', this.boundOnPointerDown);
    }

    private updateMouse(event: PointerEvent) {
        const rect = this.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    private onPointerDown(event: PointerEvent) {
        if (event.button !== 0) return;
        this.updateMouse(event);

        this.raycaster.setFromCamera(this.mouse, this.camera);
        // We only want to destroy tracked objects (Trees, Rocks, Flowerbeds)
        const intersects = this.raycaster.intersectObjects(this.trackingObjects, true);

        if (intersects.length > 0) {
            // Find the root object in the tracking array
            let hitObj: THREE.Object3D | null = intersects[0].object;
            let rootObj: THREE.Object3D | null = null;

            while (hitObj && hitObj !== this.scene) {
                if (this.trackingObjects.includes(hitObj)) {
                    rootObj = hitObj;
                    break;
                }
                hitObj = hitObj.parent;
            }

            if (rootObj) {
                this.destroyObject(rootObj);
            }
        }
    }

    private destroyObject(obj: THREE.Object3D) {
        // Remove from tracking array so it doesn't snap to terrain anymore
        const idx = this.trackingObjects.indexOf(obj);
        if (idx !== -1) {
            this.trackingObjects.splice(idx, 1);
        }

        // Use userData.type for identification
        const objType = obj.userData.type;

        if (objType === 'tree') {
            this.fellTree(obj as THREE.Group);
        } else if (objType === 'flowerbed') {
            this.shatterFlowerbed(obj as THREE.Group);
        } else if (obj instanceof THREE.Mesh && obj.geometry instanceof THREE.IcosahedronGeometry) {
            // Rocks (legacy detection)
            this.shatterRock(obj as THREE.Mesh);
        } else if (obj instanceof THREE.Group) {
            // Fallback: assume unknown groups are trees
            this.fellTree(obj as THREE.Group);
        }
    }

    // ============================================================
    //  木の伐採 — HingeConstraint で根元から倒れる
    // ============================================================
    private fellTree(treeGroup: THREE.Group) {
        // Measure tree bounds from its children
        const bbox = new THREE.Box3().setFromObject(treeGroup);
        const treeHeight = bbox.max.y - bbox.min.y;

        // Use a slim cylinder for collision (trunk-sized, not canopy-sized)
        const shapeRadius = 0.12;
        const shape = new CANNON.Cylinder(shapeRadius, shapeRadius, treeHeight, 8);
        const shapeQuat = new CANNON.Quaternion();

        // Create the dynamic tree body — center of mass at the tree's geometric center
        const treePos = treeGroup.position.clone();
        // Raise body slightly so the cylinder bottom doesn't touch the ground at start
        const liftOffset = 0.15;
        const treeCenterY = treePos.y + treeHeight / 2 + liftOffset;

        const treeBody = new CANNON.Body({
            mass: 50,
            material: this.physics.woodMaterial,
            position: new CANNON.Vec3(treePos.x, treeCenterY, treePos.z),
            angularDamping: 0.4, // Air resistance for "creaking" timber effect
        });
        treeBody.addShape(shape, new CANNON.Vec3(0, 0, 0), shapeQuat);

        // Initially disable collision with ground using collision groups
        // Group 2 = tree, Mask = only group 2 (no ground contact yet)
        treeBody.collisionFilterGroup = 2;
        treeBody.collisionFilterMask = 0; // No collisions initially

        // Sync initial rotation from the Three.js group
        treeBody.quaternion.copy(treeGroup.quaternion as unknown as CANNON.Quaternion);

        // Create an invisible static anchor at the tree base
        const anchorBody = new CANNON.Body({
            type: CANNON.Body.STATIC,
            position: new CANNON.Vec3(treePos.x, treePos.y + liftOffset, treePos.z),
        });
        this.physics.world.addBody(anchorBody);

        // HingeConstraint connecting anchor to tree body at the base
        // The pivot on the tree body is at -height/2 (its bottom)
        // Choose a random horizontal hinge axis for the fall direction
        const fallAngle = Math.random() * Math.PI * 2;
        const hingeAxis = new CANNON.Vec3(Math.cos(fallAngle), 0, Math.sin(fallAngle));

        const hinge = new CANNON.HingeConstraint(anchorBody, treeBody, {
            pivotA: new CANNON.Vec3(0, 0, 0),
            pivotB: new CANNON.Vec3(0, -treeHeight / 2, 0),
            axisA: hingeAxis,
            axisB: hingeAxis,
        });
        this.physics.addConstraint(hinge);

        // We need to offset the treeGroup rendering so it tracks the body correctly.
        // The body center is at (treePos.x, treeCenterY, treePos.z) — i.e. the middle of the tree.
        // But the Three.js group has its origin at treePos (the base).
        // We'll create a wrapper group to handle this offset.
        const wrapper = new THREE.Group();
        wrapper.position.set(treePos.x, treeCenterY, treePos.z);
        wrapper.quaternion.copy(treeGroup.quaternion);

        // Move the tree group into the wrapper, offsetting it so its base sits at -height/2
        this.scene.remove(treeGroup);
        treeGroup.position.set(0, -treeHeight / 2 - liftOffset, 0);
        treeGroup.rotation.set(0, treeGroup.rotation.y, 0); // Keep Y rotation only as local
        wrapper.add(treeGroup);
        this.scene.add(wrapper);

        // Register the wrapper with physics for position/rotation sync
        this.physics.addObj(wrapper, treeBody);

        // Apply torque perpendicular to the hinge axis to make it fall
        const pushDir = new CANNON.Vec3(-Math.sin(fallAngle), 0, Math.cos(fallAngle));

        // Apply a strong impulse at the top of the tree for maximum leverage
        const topPoint = new CANNON.Vec3(0, treeHeight / 2, 0);
        treeBody.applyImpulse(pushDir.scale(25), topPoint);

        // Collect leaf color for particles
        let leafColor = 0x3d8c2f; // fallback
        treeGroup.children.forEach(child => {
            if (child instanceof THREE.Mesh && child.geometry instanceof THREE.IcosahedronGeometry) {
                if (child.material instanceof THREE.MeshPhongMaterial && child.material.color) {
                    leafColor = child.material.color.getHex();
                }
            }
        });

        // Time-gated collision listener — only activate after tree has had time to fall
        const fellStartTime = performance.now();
        let leavesScattered = false;

        treeBody.addEventListener('collide', (event: { body: CANNON.Body }) => {
            // Ignore collisions in the first 800ms (tree is still starting to tip)
            if (performance.now() - fellStartTime < 800) return;

            if (event.body === this.physics.groundBody && !leavesScattered) {
                leavesScattered = true;
                this.scatterLeaves(treeGroup, leafColor);

                // Release the hinge after a short delay so the trunk can roll freely
                setTimeout(() => {
                    try {
                        this.physics.removeConstraint(hinge);
                        this.physics.world.removeBody(anchorBody);
                    } catch (_e) { /* already removed */ }
                }, 500);
            }
        });

        // After a short delay, enable ground collisions so the tree can hit the ground
        setTimeout(() => {
            treeBody.collisionFilterGroup = 1;
            treeBody.collisionFilterMask = -1; // Collide with everything
        }, 600);

        // Safety: release hinge after 4 seconds even if no collision detected
        setTimeout(() => {
            if (!leavesScattered) {
                leavesScattered = true;
                this.scatterLeaves(treeGroup, leafColor);
            }

            try {
                this.physics.removeConstraint(hinge);
                this.physics.world.removeBody(anchorBody);
            } catch (_e) { /* already removed */ }
        }, 4000);
    }

    /**
     * Hide leaf meshes on a tree and spawn leaf particles at their current world positions.
     */
    private scatterLeaves(treeGroup: THREE.Group, leafColor: number) {
        const leafWorldPositions: THREE.Vector3[] = [];
        treeGroup.children.forEach(child => {
            if (child instanceof THREE.Mesh && child.geometry instanceof THREE.IcosahedronGeometry) {
                child.visible = false;
                const wp = new THREE.Vector3();
                child.getWorldPosition(wp);
                leafWorldPositions.push(wp);
            }
        });

        for (const pos of leafWorldPositions) {
            this.spawnLeafParticles(pos, leafColor);
        }
    }

    // ============================================================
    //  葉のパーティクル — ヒラヒラと舞い落ちる
    // ============================================================
    private spawnLeafParticles(pos: THREE.Vector3, colorHex: number) {
        const count = 8;
        const leafGeo = new THREE.PlaneGeometry(0.06, 0.08); // small rectangular leaves
        const leafMat = new THREE.MeshBasicMaterial({
            color: colorHex,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9
        });

        for (let i = 0; i < count; i++) {
            const leaf = new THREE.Mesh(leafGeo, leafMat);
            // Spawn around the given position with some spread
            leaf.position.set(
                pos.x + (Math.random() - 0.5) * 0.6,
                pos.y + (Math.random() - 0.5) * 0.3,
                pos.z + (Math.random() - 0.5) * 0.6
            );
            leaf.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
            this.scene.add(leaf);

            // Very light sphere for fluttering physics
            const shape = new CANNON.Sphere(0.03);
            const body = new CANNON.Body({
                mass: 0.05, // extremely light
                material: this.physics.woodMaterial,
                position: new CANNON.Vec3(leaf.position.x, leaf.position.y, leaf.position.z),
                linearDamping: 0.85, // high air resistance so they flutter down slowly
                angularDamping: 0.6,
            });
            body.addShape(shape);
            this.physics.addObj(leaf, body);

            // Give them a gentle push outward + upward
            const flutterForce = new CANNON.Vec3(
                (Math.random() - 0.5) * 1.5,
                Math.random() * 1.5, // slightly up
                (Math.random() - 0.5) * 1.5
            );
            body.applyImpulse(flutterForce, new CANNON.Vec3(0, 0, 0));
            body.angularVelocity.set(
                (Math.random() - 0.5) * 8,
                (Math.random() - 0.5) * 8,
                (Math.random() - 0.5) * 8
            );
        }
    }

    // ============================================================
    //  花壇の破壊 — バラバラに散る
    // ============================================================
    private shatterFlowerbed(bedGroup: THREE.Group) {
        const pos = bedGroup.position.clone();
        // Remove original from scene
        this.scene.remove(bedGroup);

        // Break each child mesh into individual physics objects
        const children = [...bedGroup.children]; // clone array since we modify it
        for (const child of children) {
            if (!(child instanceof THREE.Mesh)) continue;

            const shard = child.clone();
            // Convert local position to world position
            const worldPos = new THREE.Vector3();
            child.getWorldPosition(worldPos);
            shard.position.copy(worldPos);

            // Copy world rotation
            const worldQuat = new THREE.Quaternion();
            child.getWorldQuaternion(worldQuat);
            shard.quaternion.copy(worldQuat);

            shard.castShadow = true;
            this.scene.add(shard);

            // Create physics body from bounding box
            const bbox = new THREE.Box3().setFromObject(shard);
            const size = new THREE.Vector3();
            bbox.getSize(size);

            // Ensure minimum size for physics stability
            const hx = Math.max(size.x / 2, 0.02);
            const hy = Math.max(size.y / 2, 0.02);
            const hz = Math.max(size.z / 2, 0.02);

            const shape = new CANNON.Box(new CANNON.Vec3(hx, hy, hz));
            const body = new CANNON.Body({
                mass: 2 + Math.random() * 3,
                material: this.physics.flowerMaterial,
                position: new CANNON.Vec3(worldPos.x, worldPos.y, worldPos.z),
            });
            body.addShape(shape);
            body.quaternion.copy(shard.quaternion as unknown as CANNON.Quaternion);

            this.physics.addObj(shard, body);

            // Small outward + upward force
            const outForce = new CANNON.Vec3(
                (worldPos.x - pos.x) * 8 + (Math.random() - 0.5) * 3,
                5 + Math.random() * 5,
                (worldPos.z - pos.z) * 8 + (Math.random() - 0.5) * 3
            );
            body.applyImpulse(outForce, new CANNON.Vec3(0, 0, 0));
            body.angularVelocity.set(
                (Math.random() - 0.5) * 5,
                (Math.random() - 0.5) * 5,
                (Math.random() - 0.5) * 5
            );
        }
    }

    // ============================================================
    //  岩の破壊（既存・そのまま）
    // ============================================================
    private shatterRock(rockMesh: THREE.Mesh) {
        // Hide original rock
        this.scene.remove(rockMesh);

        const pos = rockMesh.position;
        // Make 4 to 6 smaller rocks
        const numShards = 4 + Math.floor(Math.random() * 3);
        for (let i = 0; i < numShards; i++) {
            const baseSize = 0.08 + Math.random() * 0.08;
            const geo = new THREE.IcosahedronGeometry(baseSize, 0);

            // Reuse original material if possible
            const mat = rockMesh.material;
            const shard = new THREE.Mesh(geo, mat);
            shard.position.copy(pos);
            shard.position.y += 0.05 + Math.random() * 0.1; // keep it low

            // Random scaling for jagged look
            const sx = 0.5 + Math.random() * 1.5;
            const sy = 0.5 + Math.random() * 1.5;
            const sz = 0.5 + Math.random() * 1.5;
            shard.scale.set(sx, sy, sz);

            // Random offset so they don't exactly overlap, but closer together
            shard.position.x += (Math.random() - 0.5) * 0.1;
            shard.position.z += (Math.random() - 0.5) * 0.1;

            // Random initial rotation
            shard.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

            shard.castShadow = true;
            shard.receiveShadow = true;
            this.scene.add(shard);

            // Use CANNON.Box for uneven tumbling. Convert radius to half-extents.
            const halfExtents = new CANNON.Vec3(baseSize * sx, baseSize * sy, baseSize * sz);
            const shape = new CANNON.Box(halfExtents);

            const body = new CANNON.Body({
                mass: 20 + Math.random() * 10, // Much heavier rocks
                material: this.physics.rockMaterial,
                position: new CANNON.Vec3(shard.position.x, shard.position.y, shard.position.z),
            });
            body.addShape(shape);
            // Match initial rotation
            body.quaternion.copy(shard.quaternion as unknown as CANNON.Quaternion);

            this.physics.addObj(shard, body);

            // Weak outward crumble force instead of explosion
            const crumbleForce = new CANNON.Vec3(
                (shard.position.x - pos.x) * 15,
                20 + Math.random() * 10,  // slight hop
                (shard.position.z - pos.z) * 15
            );
            body.applyImpulse(crumbleForce, new CANNON.Vec3(0, 0, 0));
        }
    }
}
