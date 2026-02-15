import * as THREE from "three"

/**
 * 島の端から落ちる滝
 * パーティクル（小ボックス群）が上から下へ流れ落ちてフェードアウト
 */
export function createWaterfall(scene: THREE.Scene) {
    const group = new THREE.Group()
    // メイン島の端に配置
    group.position.set(-2.5, 3.0, 1.5)

    const waterMat = new THREE.MeshPhongMaterial({
        color: 0x6bc5f0,
        flatShading: true,
        transparent: true,
        opacity: 0.7,
        emissive: 0x1a4a6e,
        emissiveIntensity: 0.2,
    })

    // 滝の本体（薄い板）
    const fallGeo = new THREE.BoxGeometry(0.6, 3.5, 0.15)
    const fallMesh = new THREE.Mesh(fallGeo, waterMat.clone())
        ; (fallMesh.material as THREE.MeshPhongMaterial).opacity = 0.5
    fallMesh.position.y = -2.5
    group.add(fallMesh)

    // 島の上からの水源
    const sourceGeo = new THREE.BoxGeometry(0.8, 0.15, 0.5)
    const source = new THREE.Mesh(sourceGeo, waterMat.clone())
    source.position.set(0.1, -0.3, 0.1)
    group.add(source)

    // パーティクル（小さなボックス群）
    const particleCount = 30
    const particles: THREE.Mesh[] = []
    const particleStarts: number[] = []

    for (let i = 0; i < particleCount; i++) {
        const size = 0.05 + Math.random() * 0.08
        const pGeo = new THREE.BoxGeometry(size, size, size)
        const pMat = new THREE.MeshPhongMaterial({
            color: 0x8ad8f8,
            flatShading: true,
            transparent: true,
            opacity: 0.8,
        })
        const p = new THREE.Mesh(pGeo, pMat)
        p.position.set(
            (Math.random() - 0.5) * 0.5,
            -Math.random() * 4,
            (Math.random() - 0.5) * 0.2
        )
        particles.push(p)
        particleStarts.push(Math.random() * 4) // 初期オフセット
        group.add(p)
    }

    // 飛沫（底部）
    const splashGeo = new THREE.SphereGeometry(0.4, 6, 4)
    const splash = new THREE.Mesh(splashGeo, new THREE.MeshPhongMaterial({
        color: 0xaae4ff,
        flatShading: true,
        transparent: true,
        opacity: 0.4,
    }))
    splash.scale.set(1.2, 0.3, 1.2)
    splash.position.y = -4.2
    group.add(splash)

    scene.add(group)

    return (time: number) => {
        // パーティクルを下方向に移動、ループ
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i]
            const mat = p.material as THREE.MeshPhongMaterial
            const cycle = (time * 1.5 + particleStarts[i]) % 4
            p.position.y = -cycle
            p.position.x = (Math.sin(time * 2 + i) * 0.1)

            // 下部でフェードアウト
            if (cycle > 3) {
                mat.opacity = (4 - cycle) * 0.8
            } else {
                mat.opacity = 0.8
            }
        }

        // 飛沫のアニメーション
        splash.scale.x = 1.2 + Math.sin(time * 3) * 0.1
        splash.scale.z = 1.2 + Math.cos(time * 3) * 0.1
    }
}
