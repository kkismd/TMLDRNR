# TMLDRNR

TMLDRNR は、Lode Runner に見られる決定論的な敵追跡を、小さなターン制盤面に移したパズルの実験プロジェクトです。敵の動きを読み、意図した経路へ誘導することが、短手数の独立したパズルとして成立するかを PoC で検証します。最終的にはモバイル Web 向けの製品を目指します。

現在の画面では Player の基本移動、1 turn 1 マスの落下、turn 数を確認できます。Guard は表示のみで移動せず、勝敗判定や Undo もまだありません。

## 起動方法

build step や npm install は不要です。リポジトリのルートで静的 HTTP server を起動し、`http://localhost:8000/` を開いてください。Python が利用できる環境なら、次のコマンドを使えます。

```sh
python3 -m http.server 8000
```

ブラウザの ES modules を使用するため、`index.html` を `file://` で直接開かず、HTTP 経由で開いてください。

矢印キーまたは画面上のボタンで上下左右、Space キーまたは「待機」ボタンで wait を入力できます。落下中は任意 Action を受け付けず、「落下を 1 turn 進める」で 1 マスずつ進みます。盤面の下に turn、状態、最後の遷移を表示します。

Core の移動回帰ケースは `node tests/core-step.mjs` で実行できます。

## 構成

- `index.html` / `style.css`: 静的な画面と最小限の見た目
- `src/stages.js`: 表示確認用の 13×9 サンプル盤面
- `src/core/`: UI に依存しない Action、GameState、Player の状態遷移
- `src/web/`: DOM 描画と keyboard / ボタン入力
- `src/main.js`: stage、state、renderer、input の接続

Core は UI event を受け取らず、Action を `step(state, action)` へ渡して決定論的に遷移します。Guard AI、衝突、勝敗、Undo は後続 issue の対象です。
