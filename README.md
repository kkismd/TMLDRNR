# TMLDRNR

TMLDRNR は、Lode Runner に見られる決定論的な敵追跡を、小さなターン制盤面に移したパズルの実験プロジェクトです。敵の動きを読み、意図した経路へ誘導することが、短手数の独立したパズルとして成立するかを PoC で検証します。最終的にはモバイル Web 向けの製品を目指します。

## 起動方法

build step や npm install は不要です。リポジトリのルートで静的 HTTP server を起動し、`http://localhost:8000/` を開いてください。Python が利用できる環境なら、次のコマンドを使えます。

```sh
python3 -m http.server 8000
```

ブラウザの ES modules を使用するため、`index.html` を `file://` で直接開かず、HTTP 経由で開いてください。

矢印キーまたは画面上のボタンで上下左右、Space キーまたは「待機」ボタンで wait を入力できます。accepted Action は1 world turnとなり、その Action や terrain change による Player の落下は安定位置または terminal state まで同じ turn 内で自動解決されます。Undo / Restart と、turn・状態・最後の遷移を画面に表示します。

## Core の契約

`step(state, action, cadence)` が唯一の world-turn entry point です。rejected Action は state と turn を進めず、accepted Action は `turn` を一度だけ増やします。Player の gravity、Guard 更新、hole / trap lifecycle は同じ world turn 内で処理します。

Player Action helper は合法性と Player の意思決定結果だけを反映し、gravity や turn increment を行いません。`decideGuardMove(state, guardIndex)` は supported Guard の base terrain 上の planning のみを行います。実際の Guard movement、current terrain 上の gravity、trap、collision は `step()` が解決します。unsupported Guard は AI decision を行わず gravity し、Guard occupancy によって落下できない場合はその位置に留まります。

Guard の通常移動 cadence は `GuardCadence.EVERY_TURN`（1:1、Web の既定値）、`TWO_OF_THREE`（2:3）、`EVERY_OTHER`（1:2）、`BY_GUARD_COUNT` から選べます。2:3 は3の倍数 turn、1:2 は偶数 turn を skip します。`BY_GUARD_COUNT` は Guard 総数 N に対して N turn に1回通常行動し、turn 1 から始めます。Guard 総数依存の頻度は PoC の比較条件で、最終採用は未決定です。

結果の `guardOutcome` / `guardDecision` は、通常移動・gravity・cadence skip・AI stay を区別します。gravity の `guardDecision` は `null` です。Guard planner は `chase`、`candidate`、`stay` を返します。

## 確認

全ユニット / 回帰テストは、リポジトリのルートで `npm test` を実行してください。

## 構成

- `index.html` / `style.css`: 静的な画面と最小限の見た目
- `src/stages.js`: 表示確認用の 13×9 サンプル盤面
- `src/core/`: UI に依存しない Action、GameState、world-turn 遷移、Guard planning
- `src/web/`: DOM 描画、keyboard / button 入力、Undo / Restart session
- `src/main.js`: stage、state、renderer、input の接続
