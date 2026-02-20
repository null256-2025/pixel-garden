// =============================================
//  createIsland.ts — 浮遊島シーン生成
// =============================================
import * as THREE from 'three'

// ---- テーマ定義 ----
export type ThemeName = 'default' | 'theme2' | 'theme3'

interface ThemeColors {
    sky: number
    fog: number
    ground: number
    islandSide: number
    grass: number
    treeTrunk: number
    treeLeaf: number
    rock: number
    houseWall: number
    houseRoof: number
    cloud: number
}

const THEMES: Record<ThemeName, ThemeColors> = {
    default: {
        sky: 0x87ceeb,
        fog: 0xb0d8f0,
        ground: 0x5a9e4a,
        islandSide: 0x8b6914,
        grass: 0x4a8a3a,
        treeTrunk: 0x6b4226,
        treeLeaf: 0x3a7d44,
        rock: 0x888888,
        houseWall: 0xd4b896,
        houseRoof: 0x4a7c9e,
        cloud: 0xffffff,
    },
    theme2: {
        sky: 0xffd6e0,
        fog: 0xffe0ec,
        ground: 0x8fbc8f,
        islandSide: 0xc4956a,
        grass: 0x7aad7a,
        treeTrunk: 0x8b5e3c,
        treeLeaf: 0xf4a0b5,
        rock: 0xb0a0c0,
        houseWall: 0xfff0f5,
        houseRoof: 0xe07090,
        cloud: 0xffe8f0,
    },
    theme3: {
        sky: 0x0d1b2a,
        fog: 0x1a2a3a,
        ground: 0x1a3a2a,
        islandSide: 0x2a1a0a,
        grass: 0x0a2a1a,
        treeTrunk: 0x3a2a1a,
        treeLeaf: 0x00ff88,
        rock: 0x334455,
        houseWall: 0x1a2a3a,
        houseRoof: 0x00aaff,
        cloud: 0x334466,
    },
}

// ---- ヘルパー ----
function mat(color: number, roughness = 0.9): THREE.MeshLambertMaterial {
    return new THREE.MeshLambertMaterial({ color })
}

// ---- 島本体 ----
function createIslandBase(scene: THREE.Scene, colors: ThemeColors): void {
    // 地面トップ
    const groundGeo = new THREE.CylinderGeometry(4.5, 4.2, 0.4, 8)
    const ground = new THREE.Mesh(groundGeo, mat(colors.ground))
    ground.position.y = 0
    ground.receiveShadow = true
    scene.add(ground)

    // 島の側面（土）
    const sideGeo = new THREE.CylinderGeometry(4.2, 3.2, 1.2, 8)
    const side = new THREE.Mesh(sideGeo, mat(colors.islandSide))
    side.position.y = -0.8
    scene.add(side)

    // 底面
    const bottomGeo = new THREE.CylinderGeometry(3.2, 2.8, 0.3, 8)
    const bottom = new THREE.Mesh(bottomGeo, mat(colors.islandSide))
    bottom.position.y = -1.55
    scene.add(bottom)
}

// ---- 岩 ----
function createRocks(scene: THREE.Scene, colors: ThemeColors): void {
    const positions: [number, number, number, number][] = [
        [-2.8, 0.25, 1.5, 0.35],
        [-3.2, 0.2, -0.5, 0.28],
        [2.5, 0.2, 2.2, 0.3],
        [3.0, 0.18, -1.8, 0.25],
        [-1.5, 0.18, -3.0, 0.22],
    ]
    for (const [x, y, z, r] of positions) {
        const geo = new THREE.DodecahedronGeometry(r, 0)
        const mesh = new THREE.Mesh(geo, mat(colors.rock))
        mesh.position.set(x, y, z)
        mesh.rotation.y = Math.random() * Math.PI
        mesh.castShadow = true
        mesh.receiveShadow = true
        scene.add(mesh)
    }
}

// ---- 木 ----
export interface TreeRef {
    foliage: THREE.Mesh
    baseY: number
    phase: number
}

// 葉の色バリエーション（テーマに応じて明暗2色）
function getLeafMats(baseColor: number): THREE.MeshLambertMaterial[] {
    // ベース色から少し明るい色・暗い色を生成
    const c = new THREE.Color(baseColor)
    const bright = new THREE.Color().setHSL(c.getHSL({ h: 0, s: 0, l: 0 }).h, c.getHSL({ h: 0, s: 0, l: 0 }).s, Math.min(1, c.getHSL({ h: 0, s: 0, l: 0 }).l + 0.08))
    const dark = new THREE.Color().setHSL(c.getHSL({ h: 0, s: 0, l: 0 }).h, c.getHSL({ h: 0, s: 0, l: 0 }).s, Math.max(0, c.getHSL({ h: 0, s: 0, l: 0 }).l - 0.06))
    return [
        new THREE.MeshLambertMaterial({ color: baseColor }),
        new THREE.MeshLambertMaterial({ color: bright }),
        new THREE.MeshLambertMaterial({ color: dark }),
    ]
}

type TreeSize = 'small' | 'medium' | 'large'

const TREE_PARAMS: Record<TreeSize, { trunkH: number; trunkR: number; leafR: number; leafY: number }> = {
    small: { trunkH: 0.3, trunkR: 0.04, leafR: 0.2, leafY: 0.4 },
    medium: { trunkH: 0.55, trunkR: 0.06, leafR: 0.3, leafY: 0.7 },
    large: { trunkH: 0.75, trunkR: 0.08, leafR: 0.42, leafY: 1.0 },
}

function createTree(
    scene: THREE.Scene,
    x: number, z: number,
    colors: ThemeColors,
    size: TreeSize = 'medium'
): TreeRef {
    const p = TREE_PARAMS[size]
    const leafMats = getLeafMats(colors.treeLeaf)
    const treeGroup = new THREE.Group()

    // 幹（円柱）
    const trunkGeo = new THREE.CylinderGeometry(p.trunkR, p.trunkR * 1.3, p.trunkH, 6)
    const trunk = new THREE.Mesh(trunkGeo, new THREE.MeshLambertMaterial({ color: colors.treeTrunk }))
    trunk.position.y = p.trunkH / 2
    trunk.castShadow = true
    treeGroup.add(trunk)

    // メイン葉（IcosahedronGeometry でもこもこ）
    const leafGeo = new THREE.IcosahedronGeometry(p.leafR, 0)
    const leafMat = leafMats[Math.floor(Math.random() * leafMats.length)]
    const foliage = new THREE.Mesh(leafGeo, leafMat)
    foliage.position.y = p.leafY
    foliage.rotation.y = Math.random() * Math.PI
    foliage.castShadow = true
    treeGroup.add(foliage)

    // サブ葉（小さい球を周囲にずらして配置 → もこもこ感 up）
    if (size !== 'small') {
        const subLeafCount = size === 'large' ? 3 : 2
        for (let i = 0; i < subLeafCount; i++) {
            const angle = (i / subLeafCount) * Math.PI * 2 + Math.random() * 0.5
            const subR = p.leafR * (0.5 + Math.random() * 0.3)
            const subGeo = new THREE.IcosahedronGeometry(subR, 0)
            const subLeafMat = leafMats[Math.floor(Math.random() * leafMats.length)]
            const subLeaf = new THREE.Mesh(subGeo, subLeafMat)
            subLeaf.position.set(
                Math.cos(angle) * p.leafR * 0.55,
                p.leafY - 0.05 + Math.random() * 0.1,
                Math.sin(angle) * p.leafR * 0.55
            )
            subLeaf.castShadow = true
            treeGroup.add(subLeaf)
        }
    }

    treeGroup.position.set(x, 0.2, z)
    scene.add(treeGroup)

    return { foliage, baseY: p.leafY + 0.2, phase: Math.random() * Math.PI * 2 }
}

function createTrees(scene: THREE.Scene, colors: ThemeColors): TreeRef[] {
    const placements: [number, number, TreeSize][] = [
        [-2.5, -1.8, 'large'],
        [-3.0, 0.8, 'large'],
        [2.8, -0.5, 'large'],
        [1.5, 2.8, 'medium'],
        [-1.2, 2.5, 'medium'],
        [3.2, -2.0, 'small'],
        [-2.0, 3.0, 'small'],
    ]
    return placements.map(([x, z, size]) => createTree(scene, x, z, colors, size))
}

// ---- 家 ----
function createHouse(scene: THREE.Scene, colors: ThemeColors): void {
    // 壁
    const wallGeo = new THREE.BoxGeometry(1.4, 1.0, 1.2)
    const wall = new THREE.Mesh(wallGeo, mat(colors.houseWall))
    wall.position.set(0.8, 0.7, -0.8)
    wall.castShadow = true
    wall.receiveShadow = true
    scene.add(wall)

    // 屋根（三角プリズム風: BoxGeometry を傾ける）
    const roofGeo = new THREE.ConeGeometry(1.05, 0.7, 4)
    const roof = new THREE.Mesh(roofGeo, mat(colors.houseRoof))
    roof.position.set(0.8, 1.55, -0.8)
    roof.rotation.y = Math.PI / 4
    roof.castShadow = true
    scene.add(roof)

    // 煙突
    const chimneyGeo = new THREE.BoxGeometry(0.18, 0.4, 0.18)
    const chimney = new THREE.Mesh(chimneyGeo, mat(colors.rock))
    chimney.position.set(1.05, 1.85, -0.65)
    chimney.castShadow = true
    scene.add(chimney)

    // ドア
    const doorGeo = new THREE.BoxGeometry(0.22, 0.38, 0.05)
    const door = new THREE.Mesh(doorGeo, mat(0x6b4226))
    door.position.set(0.8, 0.39, -0.205)
    scene.add(door)
}

// ---- 雲 ----
export interface CloudRef {
    group: THREE.Group
    speed: number
}

function createCloud(scene: THREE.Scene, colors: ThemeColors, initX = -6): CloudRef {
    const group = new THREE.Group()
    const cloudMat = new THREE.MeshLambertMaterial({
        color: colors.cloud,
        transparent: true,
        opacity: 0.88,
    })

    // SphereGeometry でふわふわ丸い雲
    const parts: [number, number, number, number][] = [
        [0, 0, 0, 0.42],  // 中央（大）
        [0.42, -0.05, 0.05, 0.32], // 右
        [-0.40, -0.05, 0, 0.28], // 左
        [0.10, 0.18, 0, 0.22], // 上
        [0.05, 0.05, -0.3, 0.28], // 奥
    ]
    for (const [x, y, z, r] of parts) {
        const geo = new THREE.SphereGeometry(r, 6, 4)
        const mesh = new THREE.Mesh(geo, cloudMat)
        mesh.position.set(x, y, z)
        group.add(mesh)
    }
    group.position.set(initX, 3.5, 0)
    scene.add(group)
    return { group, speed: 0.4 }
}

// ---- 30分解放小物 ----
function createProps(scene: THREE.Scene, colors: ThemeColors): void {
    // 花
    const flowerPositions: [number, number, number][] = [
        [1.5, 0.22, 1.5],
        [-1.0, 0.22, 1.8],
        [2.5, 0.22, 0.5],
        [-2.0, 0.22, -1.5],
    ]
    const flowerColors = [0xff6b9d, 0xffcc44, 0xff8844, 0xaa44ff]
    flowerPositions.forEach(([x, y, z], i) => {
        const stemGeo = new THREE.BoxGeometry(0.04, 0.18, 0.04)
        const stem = new THREE.Mesh(stemGeo, mat(0x3a7d44))
        stem.position.set(x, y, z)
        scene.add(stem)
        const petalGeo = new THREE.BoxGeometry(0.14, 0.06, 0.14)
        const petal = new THREE.Mesh(petalGeo, mat(flowerColors[i % flowerColors.length]))
        petal.position.set(x, y + 0.12, z)
        scene.add(petal)
    })

    // 柵
    const fencePositions: [number, number, number, number][] = [
        [3.5, 0.3, 0, 0],
        [3.5, 0.3, 0.7, 0],
        [3.5, 0.3, -0.7, 0],
    ]
    for (const [x, y, z, ry] of fencePositions) {
        const postGeo = new THREE.BoxGeometry(0.08, 0.4, 0.08)
        const post = new THREE.Mesh(postGeo, mat(0xc8a878))
        post.position.set(x, y, z)
        post.rotation.y = ry
        scene.add(post)
    }
    const railGeo = new THREE.BoxGeometry(0.06, 0.06, 1.6)
    const rail = new THREE.Mesh(railGeo, mat(0xc8a878))
    rail.position.set(3.5, 0.42, 0)
    scene.add(rail)
}

// ---- メイン生成関数 ----
export interface IslandObjects {
    trees: TreeRef[]
    cloud: CloudRef
    updateTheme: (theme: ThemeName) => void
}

export function createIsland(
    scene: THREE.Scene,
    theme: ThemeName,
    unlocked30m: boolean
): IslandObjects {
    const colors = THEMES[theme]

    // 背景・霧
    scene.background = new THREE.Color(colors.sky)
    scene.fog = new THREE.Fog(colors.fog, 12, 30)

    createIslandBase(scene, colors)
    createRocks(scene, colors)
    const trees = createTrees(scene, colors)
    createHouse(scene, colors)
    if (unlocked30m) createProps(scene, colors)
    const cloud = createCloud(scene, colors)

    // テーマ切り替え（再生成）
    function updateTheme(newTheme: ThemeName): void {
        // シーンを全クリアして再生成
        const toRemove: THREE.Object3D[] = []
        scene.traverse((obj) => {
            if (obj !== scene) toRemove.push(obj)
        })
        toRemove.forEach((obj) => {
            scene.remove(obj)
            if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose()
        })
        const nc = THEMES[newTheme]
        scene.background = new THREE.Color(nc.sky)
        scene.fog = new THREE.Fog(nc.fog, 12, 30)
        createIslandBase(scene, nc)
        createRocks(scene, nc)
        createTrees(scene, nc).forEach((t) => {
            trees.length = 0
            trees.push(t)
        })
        createHouse(scene, nc)
        if (unlocked30m) createProps(scene, nc)
        const newCloud = createCloud(scene, nc)
        cloud.group = newCloud.group
    }

    return { trees, cloud, updateTheme }
}

// ---- アニメーション更新 ----
export function updateIsland(
    objects: IslandObjects,
    time: number,
    delta: number
): void {
    // 木の揺れ
    for (const tree of objects.trees) {
        tree.foliage.rotation.z = Math.sin(time * 1.2 + tree.phase) * 0.04
        tree.foliage.rotation.x = Math.sin(time * 0.9 + tree.phase + 1) * 0.02
    }

    // 雲のループ移動
    const c = objects.cloud.group
    c.position.x += objects.cloud.speed * delta
    if (c.position.x > 10) c.position.x = -10
}
