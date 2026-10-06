import { Action } from "./core/actions.js";

// Display-only sample. Tile symbols and actor positions are not final stage rules.
export const sampleStage = {
  id: "two-ladders",
  title: "2本の梯子",
  theme: "Player位置でGuardの梯子選択が変わることを観察する",
  tiles: [
    "#############",
    "#           #",
    "#  H  E  H  #",
    "###H#####H###",
    "#  H     H  #",
    "#  H     H  #",
    "#  H     H  #",
    "#  H     H  #",
    "#############",
  ],
  player: { x: 2, y: 7 },
  guards: [{ x: 10, y: 7 }],
  knownSolution: [
    Action.RIGHT,
    Action.UP, Action.UP, Action.UP, Action.UP, Action.UP,
    Action.RIGHT, Action.RIGHT, Action.RIGHT,
  ],
};

// UI smoke fixture only; it is not a Guard validation stage and does not count
// toward PoC #3's validation-stage target.
export const selectorSmokeStage = {
  id: "selector-smoke",
  title: "空盤面（操作確認）",
  theme: "Stage selector・session切替・基本移動のsmoke fixture。Guard誘導の評価には使わない",
  tiles: [
    "#############",
    "#           #",
    "#           #",
    "#           #",
    "#           #",
    "#           #",
    "#           #",
    "#          E#",
    "#############",
  ],
  player: { x: 1, y: 7 },
  guards: [],
  knownSolution: Array(10).fill(Action.RIGHT),
};

export const stages = [sampleStage, selectorSmokeStage];
