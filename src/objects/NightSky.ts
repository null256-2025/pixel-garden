import * as THREE from "three"

/**
 * 夜空を演出する星と月を作成してシーンに追加する
 * 星は Bloom で光り、月は淡黄色で浮かぶ
 */
export function createNightSky(scene: THREE.Scene) {

    // --- 星 ---
    const starMat = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 0.8,
        flatShading: true,
    })

    // さまざまなサイズ・位置の星を散りばめる
    const starCount = 60
    for (let i = 0; i < starCount; i++) {
        const size = 0.02 + Math.random() * 0.04
        const starGeo = new THREE.SphereGeometry(size, 4, 3)
        const star = new THREE.Mesh(starGeo, starMat)

        // 半球状に分布（上空に広がる感じ）
        const theta = Math.random() * Math.PI * 2
        const phi = Math.random() * Math.PI * 0.4 + 0.1 // 地平線すれすれは避ける
        const radius = 15 + Math.random() * 10

        star.position.set(
            Math.cos(theta) * Math.sin(phi) * radius,
            Math.cos(phi) * radius,
            Math.sin(theta) * Math.sin(phi) * radius
        )

        scene.add(star)
    }

    // --- 月 ---
    const moonMat = new THREE.MeshPhongMaterial({
        color: 0xfff8dc,
        emissive: 0xfff0a0,
        emissiveIntensity: 0.7,
        flatShading: true,
    })
    const moon = new THREE.Mesh(
        new THREE.SphereGeometry(0.8, 8, 6),
        moonMat
    )
    moon.position.set(-3, 5, -4) // 箱庭のすぐ上に浮かぶ
    scene.add(moon)

    // 月の光芒（少し大きめの透明球で光のにじみを演出）
    const glowMat = new THREE.MeshPhongMaterial({
        color: 0xfff8dc,
        emissive: 0xfff0a0,
        emissiveIntensity: 0.4,
        transparent: true,
        opacity: 0.2,
        flatShading: true,
    })
    const glow = new THREE.Mesh(
        new THREE.SphereGeometry(1.3, 8, 6),
        glowMat
    )
    glow.position.copy(moon.position)
    scene.add(glow)
}
