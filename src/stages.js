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
  title: "上段のロープ",
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

export const terraceDescentStage = {
  id: "terrace-descent",
  title: "段丘の足場",
  theme: "中層の床を掘って下層のGoldを回収し、Guardを引きつけながら別の梯子でGoalへ戻る",
  tiles: [
    "#############",
    "#           #",
    "#   H   E   #",
    "###H###H#####",
    "#  H   H    #",
    "#  ### H ####",
    "#      H    #",
    "#XXXXXXXXXXX#",
    "#############",
  ],
  player: { x: 2, y: 2 },
  guards: [{ x: 9, y: 4 }],
  gold: [{ x: 5, y: 6 }],
  knownSolution: [
    Action.RIGHT, Action.DOWN, Action.DOWN, Action.RIGHT, Action.WAIT, Action.DIG_RIGHT,
    Action.RIGHT, Action.WAIT, Action.WAIT, Action.RIGHT, Action.RIGHT, Action.UP,
    Action.UP, Action.UP, Action.UP, Action.RIGHT,
  ],
};

export const twoLaddersStage = {
  id: "two-ladders",
  title: "二本の梯子",
  theme: "上下の通路と二本の梯子を持つ盤面",
  tiles: [
    "#############",
    "#   ---     #",
    "# EH   H    #",
    "###HXXXH#####",
    "#  H   H    #",
    "#  H## H##  #",
    "#  H   H    #",
    "#XXXXXXXXXXX#",
    "#############",
  ],
  player: { x: 1, y: 2 },
  guards: [{ x: 10, y: 2 }],
  gold: [{ x: 11, y: 6 }],
  knownSolution: [
    Action.RIGHT, Action.LEFT, Action.RIGHT, Action.RIGHT, Action.WAIT,
    Action.UP, Action.RIGHT, Action.RIGHT, Action.RIGHT, Action.RIGHT,
    Action.RIGHT, Action.WAIT, Action.RIGHT, Action.RIGHT, Action.DIG_LEFT,
    Action.DIG_RIGHT, Action.RIGHT, Action.WAIT, Action.WAIT, Action.WAIT,
    Action.WAIT, Action.LEFT, Action.LEFT, Action.LEFT, Action.LEFT,
    Action.LEFT, Action.LEFT, Action.LEFT, Action.LEFT, Action.UP,
    Action.UP, Action.UP, Action.UP, Action.LEFT,
  ],
};

export const centralLadderStage = {
  id: "central-ladder",
  title: "中央の梯子",
  theme: "Guardの足場化と中央梯子での同期解除を含む試遊済み検証stage",
  tiles: [
    "#############",
    "#           #",
    "#           #",
    "#           #",
    "# # ####H##H#",
    "#       H  H#",
    "#       H EH#",
    "##      H  H#",
    "##XXXXXXXXX##",
  ],
  player: { x: 4, y: 3 },
  guards: [{ x: 2, y: 3 }, { x: 10, y: 7 }],
  gold: [{ x: 3, y: 3 }],
  knownSolution: [
    Action.RIGHT, Action.LEFT, Action.WAIT, Action.LEFT,
    Action.WAIT, Action.WAIT, Action.WAIT,
    Action.RIGHT, Action.RIGHT, Action.RIGHT, Action.RIGHT, Action.RIGHT, Action.RIGHT,
    Action.WAIT, Action.RIGHT, Action.RIGHT, Action.UP, Action.LEFT,
  ],
};

export const fourChambersStage = {
  id: "four-chambers",
  title: "四つの小部屋",
  theme: "Championship Lode Runner 50面を着想源とした2×2の掘削・経路構築課題。Guard誘導を主題としない",
  tiles: [
    "        H   H",
    "H#######H   H",
    "H#  #H #H#  H",
    "H#  #  #H### ",
    "H ##### H# ##",
    "H# H#  #H### ",
    "H#  #  #H# ##",
    "H#######H##- ",
    "        H#  E",
  ],
  player: { x: 1, y: 0 },
  guards: [{ x: 10, y: 8 }],
  gold: [
    { x: 2, y: 3 }, { x: 6, y: 3 }, { x: 12, y: 3 },
    { x: 10, y: 4 }, { x: 12, y: 5 },
    { x: 2, y: 6 }, { x: 6, y: 6 }, { x: 10, y: 6 }, { x: 12, y: 7 },
  ],
  knownSolution: [
    Action.RIGHT, Action.RIGHT, Action.RIGHT, Action.RIGHT, Action.DIG_LEFT, Action.RIGHT, Action.DIG_LEFT, Action.LEFT, Action.WAIT, Action.DIG_LEFT,
    Action.DOWN, Action.DIG_LEFT, Action.RIGHT, Action.WAIT, Action.LEFT, Action.LEFT, Action.LEFT, Action.DIG_RIGHT, Action.LEFT, Action.DIG_RIGHT,
    Action.RIGHT, Action.WAIT, Action.DIG_RIGHT, Action.DOWN, Action.DIG_RIGHT, Action.LEFT, Action.WAIT, Action.RIGHT, Action.RIGHT, Action.RIGHT,
    Action.DIG_RIGHT, Action.RIGHT, Action.WAIT, Action.WAIT, Action.RIGHT, Action.RIGHT, Action.UP, Action.UP, Action.UP, Action.UP, Action.UP, Action.UP, Action.UP,
    Action.DIG_RIGHT, Action.DOWN, Action.DIG_RIGHT, Action.DOWN, Action.DIG_RIGHT, Action.DOWN, Action.DIG_RIGHT, Action.DOWN, Action.DIG_RIGHT,
    Action.RIGHT, Action.WAIT, Action.RIGHT, Action.LEFT, Action.LEFT, Action.UP, Action.UP, Action.UP, Action.UP, Action.UP, Action.RIGHT, Action.RIGHT, Action.WAIT,
    Action.RIGHT, Action.RIGHT, Action.DIG_LEFT, Action.DOWN, Action.DIG_LEFT, Action.LEFT, Action.WAIT, Action.LEFT, Action.DIG_RIGHT,
    Action.RIGHT, Action.WAIT, Action.DIG_RIGHT, Action.RIGHT, Action.WAIT, Action.WAIT, Action.WAIT,
  ],
};

export const stages = [blankStage, goldGuardRepositionStage, terraceDescentStage, twoLaddersStage, centralLadderStage, fourChambersStage];
