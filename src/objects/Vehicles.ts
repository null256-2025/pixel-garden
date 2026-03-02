import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Creates a cute, boxy car model (like an old sedan or hatchback)
 * using BufferGeometry Utils to merge parts.
 */
export function createNeonCarGeometry(): THREE.BufferGeometry {
    const geometries: THREE.BufferGeometry[] = [];

    // --- 1. Main Body (Lower part) ---
    // A simple, slightly elongated box
    const bodyWidth = 1.0;
    const bodyHeight = 0.45;
    const bodyLength = 2.0;
    const bodyGeo = new THREE.BoxGeometry(bodyWidth, bodyHeight, bodyLength);
    bodyGeo.translate(0, bodyHeight / 2 + 0.15, 0); // Lift above ground (wheels take 0.15)

    // Crucial: define groups for bodyGeo so mergeBufferGeometries(..., true) works correctly
    bodyGeo.clearGroups();
    // 6 faces * 2 triangles * 3 vertices = 36 indices/vertices. Use material index 0.
    bodyGeo.addGroup(0, bodyGeo.index ? bodyGeo.index.count : bodyGeo.attributes.position.count, 0);

    geometries.push(bodyGeo);

    // --- 2. Cabin (Upper part) ---
    // A boxy cabin sitting on top of the body
    const cabinWidth = 0.8;
    const cabinHeight = 0.4;
    const cabinLength = 1.0;
    const cabinGeo = new THREE.BoxGeometry(cabinWidth, cabinHeight, cabinLength);

    // Position it slightly towards the back, and sink it slightly into the body to ensure connection
    cabinGeo.translate(0, bodyHeight + 0.15 + cabinHeight / 2 - 0.05, -0.1);

    // Taper the cabin slightly
    const cabinPos = cabinGeo.attributes.position;
    for (let i = 0; i < cabinPos.count; i++) {
        const y = cabinPos.getY(i);
        const z = cabinPos.getZ(i);
        if (y > bodyHeight + 0.15) { // Roof vertices
            cabinPos.setX(i, cabinPos.getX(i) * 0.9); // slightly narrower roof
            if (z > -0.1) {
                // Front windshield slope
                cabinPos.setZ(i, z - 0.2);
            } else {
                // Back windshield slope
                cabinPos.setZ(i, z + 0.1);
            }
        }
    }

    // Set material index for the "windows" on the cabin
    // BoxGeometry has 6 faces (each is 2 triangles = groups of 6 vertices)
    // Indexes: 0:right, 1:left, 2:top, 3:bottom, 4:front(Z+), 5:back(Z-)
    cabinGeo.clearGroups();
    for (let i = 0; i < 6; i++) {
        // We'll use material 0 for body, material 1 for windows
        const matIndex = (i === 4 || i === 5) ? 1 : 0;
        cabinGeo.addGroup(i * 6, 6, matIndex);
    }

    cabinGeo.computeVertexNormals();
    geometries.push(cabinGeo);

    // --- 3. Wheels ---
    // 4 thick, chunky wheels
    const wheelRadius = 0.25;
    const wheelThickness = 0.15;
    const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelThickness, 12);
    wheelGeo.rotateZ(Math.PI / 2); // Lay flat on sides like wheels

    // Make wheels use the window material (index 1) so they are black/dark gray
    wheelGeo.clearGroups();
    wheelGeo.addGroup(0, wheelGeo.index ? wheelGeo.index.count : wheelGeo.attributes.position.count, 1);

    const wheelPositions = [
        [-bodyWidth / 2 + 0.05, wheelRadius - 0.05, 0.55],  // Front Left
        [bodyWidth / 2 - 0.05, wheelRadius - 0.05, 0.55],  // Front Right
        [-bodyWidth / 2 + 0.05, wheelRadius - 0.05, -0.55],  // Back Left
        [bodyWidth / 2 - 0.05, wheelRadius - 0.05, -0.55]   // Back Right
    ];

    for (const pos of wheelPositions) {
        const w = wheelGeo.clone();
        w.translate(pos[0], pos[1], pos[2]);
        geometries.push(w);
    }

    // --- 4. Bumpers ---
    const bumperGeo = new THREE.BoxGeometry(bodyWidth + 0.05, 0.1, 0.1);
    bumperGeo.clearGroups();
    bumperGeo.addGroup(0, 36, 1); // Use dark material

    // Front Bumper
    const frontBumper = bumperGeo.clone();
    frontBumper.translate(0, 0.25, bodyLength / 2 + 0.05);
    geometries.push(frontBumper);

    // Back Bumper
    const backBumper = bumperGeo.clone();
    backBumper.translate(0, 0.25, -bodyLength / 2 - 0.05);
    geometries.push(backBumper);

    // Merge everything into a single geometry to be used efficiently with InstancedMesh
    const mergedGeometry = BufferGeometryUtils.mergeBufferGeometries(geometries, true);
    if (!mergedGeometry) {
        console.error("Failed to merge car geometries.");
        return new THREE.BoxGeometry(1, 1, 2); // Fallback
    }

    return mergedGeometry;
}

/**
 * For testing a single car in the scene before instancing.
 */
export function createSingleTestCar(): THREE.Group {
    const group = new THREE.Group();

    const geo = createNeonCarGeometry();
    const matBody = new THREE.MeshStandardMaterial({
        color: 0xdd5555, // Body color
        roughness: 0.6,
        metalness: 0.1,
        flatShading: true
    });
    const matDark = new THREE.MeshStandardMaterial({
        color: 0x222222, // Windows, wheels, bumpers
        roughness: 0.8,
        metalness: 0.1,
        flatShading: true
    });

    // Pass array of materials so the groups pick it up
    const mesh = new THREE.Mesh(geo, [matBody, matDark]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    group.add(mesh);

    // Add visual headlights (Front, Z is positive)
    const hlGeo = new THREE.BoxGeometry(0.8, 0.1, 0.05);
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const hlMesh = new THREE.Mesh(hlGeo, hlMat);
    // Sink slightly into front face
    hlMesh.position.set(0, 0.45, 1.0);
    group.add(hlMesh);

    // Taillights (Back, Z is negative)
    const tlGeo = new THREE.BoxGeometry(0.8, 0.1, 0.05);
    const tlMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const tlMesh = new THREE.Mesh(tlGeo, tlMat);
    // Sink slightly into back face
    tlMesh.position.set(0, 0.45, -1.0);
    group.add(tlMesh);

    return group;
}
