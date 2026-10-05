# TMLDRNR

TMLDRNR は、Lode Runner に見られる決定論的な敵追跡を、小さなターン制盤面に移したパズルの実験プロジェクトです。敵の動きを読み、意図した経路へ誘導することが、短手数の独立したパズルとして成立するかを PoC で検証します。最終的にはモバイル Web 向けの製品を目指します。

現在の画面は開発基盤のサンプルです。盤面と入力された Action を確認できますが、移動や勝敗などのゲームルールはまだありません。

## 起動方法

build step や npm install は不要です。リポジトリのルートで静的 HTTP server を起動し、`http://localhost:8000/` を開いてください。Python が利用できる環境なら、次のコマンドを使えます。

```sh
python3 -m http.server 8000
```

ブラウザの ES modules を使用するため、`index.html` を `file://` で直接開かず、HTTP 経由で開いてください。

矢印キーまたは画面上のボタンで上下左右、Space キーまたは「待機」ボタンで wait を入力できます。最後の Action が盤面の下に表示されます。

## 構成

- `index.html` / `style.css`: 静的な画面と最小限の見た目
- `src/stages.js`: 表示確認用の 13×9 サンプル盤面
- `src/core/`: UI に依存しない Action とサンプル状態
- `src/web/`: DOM 描画と keyboard / ボタン入力
- `src/main.js`: stage、state、renderer、input の接続

この段階では Action を状態遷移に渡しません。ゲームルールと状態遷移は後続の issue で追加します。
