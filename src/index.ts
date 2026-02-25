import * as THREE from "three"

import { PixelEngine } from "./PixelEngine"
import { createGround } from "./objects/Ground"
import { createClouds, updateClouds } from "./objects/Clouds"
import { createTrees, createGroundGrass } from "./objects/Trees"
import { createHouse } from "./objects/House"
import { createFlowerbeds } from "./objects/Flowerbeds"

import { PathDrawer } from "./editor/PathDrawer"
import { TerrainSculptor } from "./editor/TerrainSculptor"
import { NaturePlacer } from "./editor/NaturePlacer"
import { GrowthManager } from "./editor/GrowthManager"
import { DrawPalette } from "./editor/DrawPalette"
import { DestroyerTool } from "./editor/DestroyerTool"// =========================================
//  Pixel Garden — メインエントリポイント
// =========================================

const engine = new PixelEngine({
    pixelSize: 6,
    backgroundColor: 0x87CEEB,
    bloomStrength: 0.15,
    bloomRadius: 0.1,
    bloomThreshold: 0.9,
})

const { scene } = engine

// --- シーンオブジェクトの配置 ---
const ground = createGround(scene)
createHouse(scene)
const trees = createTrees(scene)
const grassPatches = createGroundGrass(scene)
const flowerbeds = createFlowerbeds(scene)
const clouds = createClouds(scene)

// List of objects that should ride the terrain height
const trackingObjects: THREE.Group[] = [...trees, ...grassPatches, ...flowerbeds]

// --- 環境描画ツール ---
const pathDrawer = new PathDrawer(engine.camera, scene, engine.renderer.domElement)
pathDrawer.setGround(ground)

const terrainSculptor = new TerrainSculptor(engine.camera, engine.renderer.domElement)
terrainSculptor.setGround(ground)
pathDrawer.setTerrainSculptor(terrainSculptor)

const growthManager = new GrowthManager(scene)

const naturePlacer = new NaturePlacer(engine.camera, scene, engine.renderer.domElement, terrainSculptor, growthManager)
naturePlacer.setGround(ground)
naturePlacer.initTracking(trackingObjects)

const destroyerTool = new DestroyerTool(engine.camera, scene, engine.renderer.domElement, engine.physics, trackingObjects)

// Keep objects on top of the terrain when sculpted
terrainSculptor.onTerrainUpdate((sculptor) => {
    trackingObjects.forEach(obj => {
        obj.position.y = sculptor.getGroundHeightAtXZ(obj.position.x, obj.position.z)
    });
});

new DrawPalette(pathDrawer, terrainSculptor, naturePlacer, destroyerTool)

// --- ライティング（昼間の太陽光） ---
// 環境光: やや暖色の柔らかい光
scene.add(new THREE.AmbientLight(0xfff5e6, 0.8))

// 太陽光: 右上手前から照射、影あり
const sunLight = new THREE.DirectionalLight(0xfffde0, 1.0)
sunLight.position.set(5, 10, 5)
sunLight.castShadow = true
sunLight.shadow.mapSize.set(2048, 2048)
sunLight.shadow.camera.near = 0.1
sunLight.shadow.camera.far = 50
sunLight.shadow.camera.left = -10
sunLight.shadow.camera.right = 10
sunLight.shadow.camera.top = 10
sunLight.shadow.camera.bottom = -10
scene.add(sunLight)

// --- アニメーション開始 ---
engine.start(() => {
    updateClouds(clouds)
    growthManager.update(performance.now())
})
