import * as THREE from "three"

/**
 * 島の端から落ちる滝
 * パーティクルのみで流れを表現（Box平板は廃止）
 */
export function createWaterfall(scene: THREE.Scene) {
    const group = new THREE.Group()
    // メイン島の端に配置。島の上面y≈0.8、半径≈3.2付近の端
    group.position.set(-3.0, 0.5, 1.2)

    // パーティクル（水滴ボックス群）
    const particleCount = 40
    const particles: THREE.Mesh[] = []
    const particlePhases: number[] = []
    const fallHeight = 5.0 // 落下距離

    for (let i = 0; i < particleCount; i++) {
        const size = 0.08 + Math.random() * 0.12
        const pGeo = new THREE.BoxGeometry(size, size * 1.5, size)
        const pMat = new THREE.MeshPhongMaterial({
            color: 0x7accee,
            flatShading: true,
            transparent: true,
            opacity: 0.85,
            emissive: 0x2288bb,
            emissiveIntensity: 0.15,
        })
        const p = new THREE.Mesh(pGeo, pMat)
        particles.push(p)
        particlePhases.push(Math.random()) // 0〜1 の初期位相
        group.add(p)
    }

    // 水源（島の上面の水たまり）
    const poolGeo = new THREE.CylinderGeometry(0.5, 0.4, 0.08, 6)
    const pool = new THREE.Mesh(poolGeo, new THREE.MeshPhongMaterial({
        color: 0x5eb8d8,
        flatShading: true,
        transparent: true,
        opacity: 0.6,
    }))
    pool.position.set(0.3, 0.1, 0)
    group.add(pool)

    // 飛沫（底部の霧）
    const mistGeo = new THREE.SphereGeometry(0.6, 6, 4)
    const mist = new THREE.Mesh(mistGeo, new THREE.MeshPhongMaterial({
        color: 0xccecff,
        flatShading: true,
        transparent: true,
        opacity: 0.3,
    }))
    mist.scale.set(1.5, 0.4, 1.5)
    mist.position.y = -fallHeight
    group.add(mist)

    scene.add(group)

    return (time: number) => {
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i]
            const mat = p.material as THREE.MeshPhongMaterial
            // 各パーティクルの落下サイクル (0→1)
            const cycle = (time * 0.4 + particlePhases[i]) % 1
            const y = -cycle * fallHeight
            // X, Z に少し揺らぎ
            const spreadX = (Math.sin(i * 1.7 + time) * 0.15) * (0.3 + cycle * 0.7)
            const spreadZ = (Math.cos(i * 2.3 + time) * 0.1) * (0.3 + cycle * 0.7)
            p.position.set(spreadX, y, spreadZ)
            // 下に行くほどフェードアウト
            mat.opacity = 0.85 * (1 - cycle * cycle)
        }
        // 飛沫の揺れ
        mist.scale.x = 1.5 + Math.sin(time * 3) * 0.15
        mist.scale.z = 1.5 + Math.cos(time * 2.5) * 0.15
            ; (mist.material as THREE.MeshPhongMaterial).opacity = 0.2 + Math.sin(time * 2) * 0.1
    }
}
