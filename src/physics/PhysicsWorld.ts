import * as THREE from 'three';
import * as CANNON from 'cannon-es';

interface PhysicsObject {
    mesh: THREE.Object3D;
    body: CANNON.Body;
}

export class PhysicsWorld {
    public world: CANNON.World;
    private physicsObjects: PhysicsObject[] = [];
    public groundBody: CANNON.Body;

    // Materials
    public groundMaterial: CANNON.Material;
    public woodMaterial: CANNON.Material;
    public rockMaterial: CANNON.Material;
    public flowerMaterial: CANNON.Material;

    constructor() {
        this.world = new CANNON.World({
            gravity: new CANNON.Vec3(0, -20.0, 0), // Stronger gravity for less floatiness
        });

        // Add a ground plane for objects to collide with
        this.groundMaterial = new CANNON.Material('ground');
        this.woodMaterial = new CANNON.Material('wood');
        this.rockMaterial = new CANNON.Material('rock');
        this.flowerMaterial = new CANNON.Material('flower');

        // Wood collides with ground (bouncy a bit)
        const woodGroundContact = new CANNON.ContactMaterial(this.groundMaterial, this.woodMaterial, {
            friction: 0.9, // Higher friction so trees don't slide like ice
            restitution: 0.1, // less bouncy so they thump
        });

        // Rock collides with ground (harder)
        const rockGroundContact = new CANNON.ContactMaterial(this.groundMaterial, this.rockMaterial, {
            friction: 0.9,
            restitution: 0.05, // Rocks hit the ground hard and stay there
        });

        // Flower parts collide with ground
        const flowerGroundContact = new CANNON.ContactMaterial(this.groundMaterial, this.flowerMaterial, {
            friction: 0.6,
            restitution: 0.15,
        });

        this.world.addContactMaterial(woodGroundContact);
        this.world.addContactMaterial(rockGroundContact);
        this.world.addContactMaterial(flowerGroundContact);

        // Bounded ground plane (matches 8x8 island with 0.4 height)
        // CANNON.Box takes half-extents, so 4x4 with 0.2 height
        const groundShape = new CANNON.Box(new CANNON.Vec3(4, 0.2, 4));
        this.groundBody = new CANNON.Body({
            type: CANNON.Body.STATIC,
            shape: groundShape,
            material: this.groundMaterial,
            // Center is slightly below 0 so the top rests at y=0
            position: new CANNON.Vec3(0, -0.2, 0)
        });
        this.world.addBody(this.groundBody);
    }

    /**
     * Registers a mesh and its corresponding physics body to be automatically synchronized.
     */
    public addObj(mesh: THREE.Object3D, body: CANNON.Body) {
        this.world.addBody(body);
        this.physicsObjects.push({ mesh, body });
    }

    /**
     * Removes a physics body and its mesh from the simulation.
     */
    public removeObj(body: CANNON.Body) {
        const idx = this.physicsObjects.findIndex(o => o.body === body);
        if (idx !== -1) {
            this.physicsObjects.splice(idx, 1);
        }
        this.world.removeBody(body);
    }

    /**
     * Adds a constraint (e.g. HingeConstraint) to the physics world.
     */
    public addConstraint(constraint: CANNON.Constraint) {
        this.world.addConstraint(constraint);
    }

    /**
     * Removes a constraint from the physics world.
     */
    public removeConstraint(constraint: CANNON.Constraint) {
        this.world.removeConstraint(constraint);
    }

    /**
     * Updates the physics world and synchronizes all registered meshes with their bodies.
     * Call this in the main render loop.
     */
    public update(dt: number) {
        // Step the physics world (fixed time step, max sub steps)
        this.world.step(1 / 60, dt, 3);

        // Copy coordinates from Cannon to Three.js
        for (const { mesh, body } of this.physicsObjects) {
            mesh.position.copy(body.position as unknown as THREE.Vector3);
            mesh.quaternion.copy(body.quaternion as unknown as THREE.Quaternion);
        }
    }
}
