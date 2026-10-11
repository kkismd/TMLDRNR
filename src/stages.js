import { Action } from "./core/actions.js";

export const blankStage = {
  id: "blank",
  title: "ブランクマップ",
  theme: "敵やGoldのない基本操作・表示確認用。難易度検証対象ではない",
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

export const goldGuardRepositionStage = {
  id: "gold-guard-reposition",
  title: "待つことで道を開く",
  theme: "Gold回収後、左右の危険を読み、WAITとGuardの誘導を使って左上Goalへ帰る",
  tiles: [
    "#############",
    "#           #",
    "#E   -----H #",
    "##XX##  XXH##",
    "#  H      H #",
    "###H##  ##H##",
    "#  H      H #",
    "#############",
    "#############",
  ],
  player: { x: 2, y: 2 },
  guards: [{ x: 4, y: 6 }, { x: 7, y: 6 }],
  gold: [{ x: 5, y: 4 }],
  knownSolution: [
    Action.RIGHT, Action.DIG_RIGHT, Action.RIGHT, Action.WAIT, Action.WAIT,
    Action.RIGHT, Action.WAIT, Action.RIGHT, Action.WAIT, Action.WAIT,
    Action.RIGHT, Action.RIGHT, Action.RIGHT, Action.RIGHT,
    Action.UP, Action.UP, Action.UP, Action.UP,
    Action.LEFT, Action.LEFT, Action.LEFT, Action.LEFT, Action.LEFT,
    Action.LEFT, Action.LEFT, Action.LEFT, Action.LEFT,
  ],
};

export const stages = [blankStage, goldGuardRepositionStage];
