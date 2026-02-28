import * as THREE from "three"

// ネオンカラーパレット
const NEON_PARTICLE_COLORS = [
    new THREE.Color(0xff00ff), // マゼンタ
    new THREE.Color(0x00ffff), // シアン
    new THREE.Color(0x00ff88), // ネオングリーン
    new THREE.Color(0xff0066), // ネオンピンク
    new THREE.Color(0x6600ff), // ネオンパープル
    new THREE.Color(0xffff00), // イエロー
]

export interface NeonParticleSystem {
    points: THREE.Points
    velocities: Float32Array
    initialY: Float32Array
}

/**
 * アンビエントネオンパーティクルを作成してシーンに追加する
 * ネオンカラーの小さな光の粒がゆっくり漂い上昇する
 */
export function createNeonParticles(scene: THREE.Scene): NeonParticleSystem {
    const count = 200
    const spread = 18 // 地面サイズに合わせて広範囲
    const maxHeight = 5

    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const velocities = new Float32Array(count * 3)
    const initialY = new Float32Array(count)

    for (let i = 0; i < count; i++) {
        const i3 = i * 3

        // ランダムな初期位置
        positions[i3 + 0] = (Math.random() - 0.5) * spread
        positions[i3 + 1] = Math.random() * maxHeight
        positions[i3 + 2] = (Math.random() - 0.5) * spread

        initialY[i] = positions[i3 + 1]

        // ランダムなネオンカラー
        const color = NEON_PARTICLE_COLORS[Math.floor(Math.random() * NEON_PARTICLE_COLORS.length)]
        colors[i3 + 0] = color.r
        colors[i3 + 1] = color.g
        colors[i3 + 2] = color.b

        // パーティクルサイズ（ランダム）
        sizes[i] = 0.03 + Math.random() * 0.06

        // 漂う速度（ゆっくり上昇 + 横方向にドリフト）
        velocities[i3 + 0] = (Math.random() - 0.5) * 0.003 // X drift
        velocities[i3 + 1] = 0.002 + Math.random() * 0.005  // Y rise
        velocities[i3 + 2] = (Math.random() - 0.5) * 0.003 // Z drift
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    const material = new THREE.PointsMaterial({
        size: 0.08,
        vertexColors: true,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
    })

    const points = new THREE.Points(geometry, material)
    scene.add(points)

    return { points, velocities, initialY }
}

/**
 * パーティクルを毎フレーム更新する
 * ゆっくり上昇し、一定高さで消えてリセット
 */
export function updateNeonParticles(system: NeonParticleSystem) {
    const positions = system.points.geometry.attributes.position as THREE.BufferAttribute
    const posArray = positions.array as Float32Array
    const count = positions.count
    const maxHeight = 5
    const spread = 18

    for (let i = 0; i < count; i++) {
        const i3 = i * 3

        // 位置を更新
        posArray[i3 + 0] += system.velocities[i3 + 0]
        posArray[i3 + 1] += system.velocities[i3 + 1]
        posArray[i3 + 2] += system.velocities[i3 + 2]

        // ゆらゆら揺れる効果（サイン波）
        posArray[i3 + 0] += Math.sin(performance.now() * 0.001 + i * 0.5) * 0.0005

        // 一定高さを超えたらリセット
        if (posArray[i3 + 1] > maxHeight) {
            posArray[i3 + 0] = (Math.random() - 0.5) * spread
            posArray[i3 + 1] = 0
            posArray[i3 + 2] = (Math.random() - 0.5) * spread
        }
    }

    positions.needsUpdate = true
}
