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

## 複数局面・盤面サイズ（設計方針）

準備、Gold 回収、Guard 再配置、Goal 到達など、局面ごとに実効的な経路と判断が変わる構造を重視する。Dig、hole、rope、Gold は置いた数ではなく、解法に必要な役割で評価する。13x9 を基本とし、15x11 は選択肢・再誘導空間が増えるときだけ比較する。単純移動が長くなるだけなら改善ではない。

根拠: [#61](https://github.com/kkismd/TMLDRNR/issues/61)、[#78](https://github.com/kkismd/TMLDRNR/issues/78)、[#126](https://github.com/kkismd/TMLDRNR/issues/126)。

## Guard 数と岩盤（設計方針、岩盤比較は未検証）

2体の Guard は、片方の動きがもう片方の経路選択に影響するかで評価する。岩盤は安易な Dig や近道を局所的に制限するが、再誘導経路を消して一本道にしない。

根拠: [#60](https://github.com/kkismd/TMLDRNR/issues/60)、[#78](https://github.com/kkismd/TMLDRNR/issues/78)、[#143](https://github.com/kkismd/TMLDRNR/issues/143)。

## 原作由来の配置（調査による観察）

原作では水平段と縦接続、Guard をまとめて反転、一方向通過前の準備、敵を足場にする配置、時間差の利用などが確認されている。現在の PoC へは Core の規則と合致する構造だけを抽象化して試す。

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
