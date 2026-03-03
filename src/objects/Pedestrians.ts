import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export function createPedestrianGeometry(): THREE.BufferGeometry {
    const geometries: THREE.BufferGeometry[] = [];

    // All geometry definitions use Y=0 as ground level.
    // Total height will be roughly 1.0.

    // --- 1. Shoes (Mat Index 0 - Shoes/Belt/Dark stuff) ---
    const shoeW = 0.12;
    const shoeH = 0.06;
    const shoeD = 0.16;
    const shoeY = shoeH / 2;

    const leftShoe = new THREE.BoxGeometry(shoeW, shoeH, shoeD);
    leftShoe.translate(-0.08, shoeY, 0.02);
    leftShoe.clearGroups();
    leftShoe.addGroup(0, 36, 0);
    geometries.push(leftShoe);

    const rightShoe = new THREE.BoxGeometry(shoeW, shoeH, shoeD);
    rightShoe.translate(0.08, shoeY, 0.02);
    rightShoe.clearGroups();
    rightShoe.addGroup(0, 36, 0);
    geometries.push(rightShoe);

    // --- 2. Legs / Pants (Mat Index 1 - Pants/Skirt) ---
    const legW = 0.12;
    const legH = 0.35;
    const legD = 0.12;
    const legY = shoeH + (legH / 2);

    const leftLeg = new THREE.BoxGeometry(legW, legH, legD);
    leftLeg.translate(-0.08, legY, 0);
    leftLeg.clearGroups();
    leftLeg.addGroup(0, 36, 1);
    geometries.push(leftLeg);

    const rightLeg = new THREE.BoxGeometry(legW, legH, legD);
    rightLeg.translate(0.08, legY, 0);
    rightLeg.clearGroups();
    rightLeg.addGroup(0, 36, 1);
    geometries.push(rightLeg);

    // --- 3. Torso / Shirt (Mat Index 2 - Shirt) ---
    const torsoW = 0.28;
    const torsoH = 0.38;
    const torsoD = 0.16;
    const torsoY = shoeH + legH + (torsoH / 2);

    const torso = new THREE.BoxGeometry(torsoW, torsoH, torsoD);
    torso.translate(0, torsoY, 0);
    torso.clearGroups();
    torso.addGroup(0, 36, 2);
    geometries.push(torso);

    // --- 4. Arms (Mat Index 2 - Shirt sleeves) ---
    const armW = 0.1;
    const armH = 0.32;
    const armD = 0.12;
    // Arms attach near top of torso and hang down
    const armY = shoeH + legH + torsoH - (armH / 2) - 0.02;

    const leftArm = new THREE.BoxGeometry(armW, armH, armD);
    leftArm.translate(-torsoW / 2 - armW / 2, armY, 0);
    leftArm.clearGroups();
    leftArm.addGroup(0, 36, 2);
    geometries.push(leftArm);

    const rightArm = new THREE.BoxGeometry(armW, armH, armD);
    rightArm.translate(torsoW / 2 + armW / 2, armY, 0);
    rightArm.clearGroups();
    rightArm.addGroup(0, 36, 2);
    geometries.push(rightArm);

    // --- 5. Hands (Mat Index 3 - Skin) ---
    const handH = 0.08;
    const handY = armY - (armH / 2) - (handH / 2);

    const leftHand = new THREE.BoxGeometry(armW, handH, armD);
    leftHand.translate(-torsoW / 2 - armW / 2, handY, 0);
    leftHand.clearGroups();
    leftHand.addGroup(0, 36, 3);
    geometries.push(leftHand);

    const rightHand = new THREE.BoxGeometry(armW, handH, armD);
    rightHand.translate(torsoW / 2 + armW / 2, handY, 0);
    rightHand.clearGroups();
    rightHand.addGroup(0, 36, 3);
    geometries.push(rightHand);

    // --- 6. Head & Neck (Mat Index 3 - Skin) ---
    const neckH = 0.04;
    const neckW = 0.08;
    const neckY = shoeH + legH + torsoH + (neckH / 2);

    const neck = new THREE.BoxGeometry(neckW, neckH, neckW);
    neck.translate(0, neckY, 0);
    neck.clearGroups();
    neck.addGroup(0, 36, 3);
    geometries.push(neck);

    const headS = 0.22; // Size of head cube
    const headY = neckY + (neckH / 2) + (headS / 2);

    const head = new THREE.BoxGeometry(headS, headS, headS);
    head.translate(0, headY, 0);
    head.clearGroups();
    head.addGroup(0, 36, 3);
    geometries.push(head);

    // --- 7. Hair (Mat Index 4 - Hair color) ---
    // A slightly larger, flatter box on top, and maybe back
    const hairH = 0.06;
    const hair = new THREE.BoxGeometry(headS + 0.02, hairH, headS + 0.02);
    hair.translate(0, headY + (headS / 2) + (hairH / 2), 0);
    hair.clearGroups();
    hair.addGroup(0, 36, 4);
    geometries.push(hair);

    // Back of hair hanging down
    const hairBack = new THREE.BoxGeometry(headS + 0.02, headS - 0.05, 0.04);
    hairBack.translate(0, headY, -headS / 2 - 0.02);
    hairBack.clearGroups();
    hairBack.addGroup(0, 36, 4);
    geometries.push(hairBack);

    const mergedGeometry = BufferGeometryUtils.mergeBufferGeometries(geometries, true);
    if (!mergedGeometry) {
        console.error("Failed to merge pedestrian geometries.");
        return new THREE.BoxGeometry(0.5, 1.5, 0.5); // Fallback
    }

    return mergedGeometry;
}

/**
 * For testing a single pedestrian in the scene.
 */
export function createSingleTestPedestrian(): THREE.Group {
    const group = new THREE.Group();
    const geo = createPedestrianGeometry();

    // Unshaded materials match the flat-colored isometric look best
    // but we use Standard so they still react to the environment a bit
    const commonOpts = { roughness: 1.0, flatShading: true, metalness: 0.0 };

    // Matches the reference image's "Blue shirt, Red pants" guy
    const matDark = new THREE.MeshStandardMaterial({ color: 0x333333, ...commonOpts }); // Shoes
    const matPants = new THREE.MeshStandardMaterial({ color: 0xec4d37, ...commonOpts }); // Red
    const matShirt = new THREE.MeshStandardMaterial({ color: 0x00b5e2, ...commonOpts }); // Light blue
    const matSkin = new THREE.MeshStandardMaterial({ color: 0xfad9b5, ...commonOpts }); // Peach
    const matHair = new THREE.MeshStandardMaterial({ color: 0x5a3b2e, ...commonOpts }); // Brown

    const mesh = new THREE.Mesh(geo, [matDark, matPants, matShirt, matSkin, matHair]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Scale it up slightly so it's a bit more visible
    mesh.scale.set(1.5, 1.5, 1.5);

    group.add(mesh);
    return group;
}
