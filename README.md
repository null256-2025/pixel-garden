# hello-threejs
A 3D pixel-art style shader with clean outlines and edge highlights.

This was built for a quick demo, so it's not in a super usable state, but feel free to adapt and use this however you like!

[Here's a video.](https://www.youtube.com/watch?v=jFevm02NJ5M)

![Sample](/screenshot.png)

---

## 🇯🇵 日本語での解説 (Japanese Explanation)

このプロジェクトは、**Three.js** を使って 3D モデルを「ピクセルアート（ドット絵）風」に表示し、さらに「アウトライン（輪郭線）」と「エッジハイライト」をつけるデモです。

初学者の方にもわかりやすいように、どのような仕組みで動いているかを解説します。

### 🎨 ピクセルアート風に見せる仕組み

3D をドット絵のように見せるために、このプロジェクトでは主に **2つの工夫** をしています。

1.  **低解像度でレンダリングしてから拡大する**
    -   画面全体の解像度（例えば 1920x1080）で描画するのではなく、あえてその **1/6 程度の小さいサイズ** で描画します。
    -   それを画面いっぱいに引き伸ばして表示することで、ドットが大きく見える「ピクセルアート」のような見た目になります。
    -   コードでは `src/index.ts` の `renderResolution` で設定されています。

2.  **輪郭線とハイライトの追加 (ポストプロセス)**
    -   ただ解像度を下げただけでは、ぼやけた画像になってしまいます。そこで、「シェーダー（Shader）」というプログラムを使って、画像の加工（ポストプロセス）を行っています。
    -   具体的には、**「深さ（Depth）」** と **「法線（Normal）」** の情報を使って、物体のエッジを検出しています。

### 🛠 主要なファイルと役割

コードを読んでみたい方は、以下のファイルを重点的に見てみてください。

-   **`src/index.ts`**
    -   **全体の司令塔**です。
    -   3Dのシーン（Scene）、カメラ（Camera）、レンダラー（Renderer）の設定をしています。
    -   `EffectComposer` という機能を使って、「エフェクトを重ねがけ」しています。
        1.  `RenderPixelatedPass`: ピクセル化とエッジ描画（これが自作のメイン機能！）
        2.  `UnrealBloomPass`: 光をぼんやり光らせる効果（ブルーム）
        3.  `PixelatePass`: 最終的な調整

-   **`src/RenderPixelatedPass.ts`**
    -   **このプロジェクトの心臓部**です。
    -   ここでカスタムシェーダー（GLSLという言語で書かれています）を定義しています。
    -   **エッジ検出のロジック**:
        -   **Depth（深度）の差**: 隣のピクセルとの「奥行き」が急に変わるところは「物体の境界」なので、暗くしてアウトラインを描きます。
        -   **Normal（法線）の差**: 隣のピクセルと「向き」が急に変わるところ（角など）は、明るくしてハイライトを描きます。

### 🚀 試してみるには

環境構築には `Node.js` と `yarn` が必要です。

1.  **インストール**:
    ```bash
    yarn install
    ```
2.  **実行（開発モード）**:
    ```bash
    yarn watch
    ```
    これでローカルサーバーが立ち上がり、ブラウザで確認できます。

### 🧪 初心者向けチャレンジ

コードを少し触って変化を楽しんでみましょう！

1.  **ドットの粗さを変える**:
    `src/index.ts` の `renderResolution = screenResolution.clone().divideScalar( 6 )` の `6` という数字を `10` や `2` に変えてみてください。ドットがより粗くなったり、細かくなったりします。

2.  **アウトラインの色や強さを変える**:
    `src/RenderPixelatedPass.ts` の `fragmentShader` 内にある `normalEdgeCoefficient` や `depthEdgeCoefficient` の数値をいじると、線の濃さが変わります。

ぜひ、このプロジェクトを改造して、自分だけの表現を見つけてみてください！
