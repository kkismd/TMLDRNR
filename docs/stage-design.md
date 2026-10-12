# ステージ設計ガイド

TMLDRNR PoC のマップ設計で再利用できる知見をまとめる。ゲームルールは採用済み ADR、PoC の合否基準は #3、盤面・replay・試遊結果は各 Research Issue を正本とする。各項目は観察・設計方針・仮説を区別し、未検証案を確定仕様にしない。

## 地形の機能差（設計方針）

**床のひとつ上にロープを置いても、空白と同じだから意味がない。**

地形を空白に置き換えたとき、到達経路・支持・下降・敵の選択・解法が変わるかを問う。ロープが実際に空白と同じかは配置と Core の規則ごとに確認する。

### 二層すれ違い通路（仮説・未検証）

上層のロープと下層の床を左右の梯子で接続すると、Player と Guard が異なる高さを通って左右の位置を入れ替えられる可能性がある。上下は対称ではなく、Guard がロープ上、Player が下の床上にいると、Guard は下降して接触できるため LOST の危険がある。どちらが上を通るか、梯子へ移る順番が判断となる。具体的な行動列と可解性は現行 Core で未検証。

根拠: [#126](https://github.com/kkismd/TMLDRNR/issues/126)。

## Guard 経路選択（観察と設計方針）

梯子や経路が二本あるだけでは不十分。Player の立ち位置や Action によって Guard が実際に選ぶ経路が変わることを確かめる。Goal へ直行するだけで解ける面では Guard 誘導が解法の必須条件になっていない。

根拠: [#56](https://github.com/kkismd/TMLDRNR/issues/56)、[#78](https://github.com/kkismd/TMLDRNR/issues/78)。

## 再誘導可能性（観察と設計方針）

Gold 取得などで目的が変化した後も、Player に新しい Guard 配置を作るための複数の経路・移動空間を残す。一方向遷移による明示的な準備問題と、ただの脱出不能な詰みを区別する。

根拠: [#56](https://github.com/kkismd/TMLDRNR/issues/56)、[#78](https://github.com/kkismd/TMLDRNR/issues/78)、[#62](https://github.com/kkismd/TMLDRNR/issues/62)。

## Guard 誘導難易度の構造（#78 の整理）

**観察・設計方針:** 難易度の構造を検討する前に、以下の成立条件を確認する。

| 前提条件 | 確認すること |
| --- | --- |
| Route choice availability（実効的な経路選択） | Player の Action により Guard の進路を切り替えられるか。見かけ上の複数経路では不十分 |
| Reconfiguration recoverability（再配置可能性） | Gold 等の目的変化後も、望ましい Guard 配置を作り直せる経路・空間があるか |

これらが成立する盤面について、次の4軸で難易度の**質**を比較する。

| 難易度の構造 | 確認すること |
| --- | --- |
| Reconfiguration count | 解法中に Guard 配置を意図的に何回作り直す必要があるか |
| Configuration invalidation | 以前の正しい配置が、目的や局面の変化で不適切になるか |
| Configuration coupling | 同じ Player Action に反応する複数 Guard の望ましい配置が競合・干渉するか |
| Decision diversity | 異なる種類の読み・経路判断が要求されるか。同一手順の反復だけではないか |

「配置を崩した後に再誘導不能」は、高品質な難しさではなく単なる詰みになり得る。敵の多さ、手数、逃げ場の少なさをこれらの代用指標にしない。機械的な解の有無と、人間が面白いと感じる難しさも区別する。

根拠: [#78 §25–33](https://github.com/kkismd/TMLDRNR/issues/78)。

## 複数局面・盤面サイズ（設計方針）

準備、Gold 回収、Guard 再配置、Goal 到達など、局面ごとに実効的な経路と判断が変わる構造を重視する。Dig、hole、rope、Gold は置いた数ではなく、解法に必要な役割で評価する。13x9 を基本とし、15x11 は選択肢・再誘導空間が増えるときだけ比較する。単純移動が長くなるだけなら改善ではない。

根拠: [#61](https://github.com/kkismd/TMLDRNR/issues/61)、[#78](https://github.com/kkismd/TMLDRNR/issues/78)、[#126](https://github.com/kkismd/TMLDRNR/issues/126)。

## Guard 数と岩盤（設計方針、岩盤比較は未検証）

2体の Guard は、直接の接触・ブロッキングだけでなく、**同じ Player Action が両者の経路選択に作用し、一方に望ましい配置が他方の配置目標と競合する**結合も評価する。片方がもう片方を直接動かすことは必須ではない。Guard の index や処理順の暗記だけに依存する面を避ける。岩盤は安易な Dig や近道を局所的に制限するが、再誘導経路を消して一本道にしない。

根拠: [#60](https://github.com/kkismd/TMLDRNR/issues/60)、[#78 §29–33](https://github.com/kkismd/TMLDRNR/issues/78)、[#143（岩盤の比較は未実施）](https://github.com/kkismd/TMLDRNR/issues/143)。

## 過去の失敗例（調査結果）

| 候補 | 観察された失敗と教訓 |
| --- | --- |
| 13x9・single Guard の Double Gate | 二度の誘導は構成できたが、第二誘導のための横移動・梯子移動が増え、20 turn 超の増分が主に単純移動だった。手数より判断密度を評価する |
| 13x9・2 Guard blocking | blocking 自体は容易に作れるが、解法上の必須条件にすると race・一本道・不可視の Guard index／処理順暗記に寄りやすい。物理的封鎖より操作可能な経路選択を重視する |

これらは特定の試作候補の不採用理由であり、**13x9、single Guard、2 Guard blocking 全般の不可能性を証明したものではない**。

根拠: [#56 §20–21](https://github.com/kkismd/TMLDRNR/issues/56)、[#59](https://github.com/kkismd/TMLDRNR/issues/59)、[#60](https://github.com/kkismd/TMLDRNR/issues/60)。

## 原作由来の配置（調査による観察）

原作調査で抽出された配置パターンを、次のように区別する。

| 配置パターン | プレイヤーに要求する読み |
| --- | --- |
| 水平段＋少数の縦接続 | Player の高さ・側を変え、Guard に梯子・落下点を選ばせる |
| Guard の集約と反転 | 複数 Guard を片側に集めてから別経路で位置関係を反転する |
| 一方向進入前の準備 | 戻れない経路に入る前に必要な Guard 配置・目標回収を終える |
| Guard を足場・一時的な経路部品にする | 敵を所定位置に誘導して、通行条件を変える |
| 穴・WAIT などの時間窓 | 一時的な経路や拘束が成立している間に進む |
| Guard の Gold 運搬・隠し床など | 原作固有の仕組みに依存するため、現在の PoC に当然には持ち込まない |

現在の PoC では Core と採用済み ADR に合致する構造だけを試す。原作で成立した攻略法を現行ルールで検証済みの解法とは扱わない。

根拠: [#17](https://github.com/kkismd/TMLDRNR/issues/17)。

## 候補の検証手順

1. 何を Player に読ませ、Guard に何を選ばせたいか明記する。
2. 実効的な経路候補と地形を置き換えた場合の差を確認する。
3. Gold 到達、取得後の帰還、再誘導空間を確認する。
4. 現行 Core で accepted な Action 列から won になる replay と、失敗分岐を記録する。
5. BFS が使える場合、近道・最短手数・単純移動比率を確認する。limit-reached を難易度の証明にしない。
6. 初見の人間試遊で Undo、Guard の誘導感、難所、読みやすさを記録する。
7. 正式採用まで Research 候補として扱う。タイトルで解法を示唆しない。

根拠: [#3](https://github.com/kkismd/TMLDRNR/issues/3)、[#47](https://github.com/kkismd/TMLDRNR/issues/47)、[#126](https://github.com/kkismd/TMLDRNR/issues/126)。

## 維持管理

新知見はまず Research Issue に具体的盤面・結果・未検証事項を記録する。再利用できる原則だけを本書に抽出し、状態とリンクを明示する。新しいルール決定は ADR、PoC 判定は #3 で扱う。
