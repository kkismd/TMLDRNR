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

export const sameRowChaseStage = {
  id: "same-row-chase",
  title: "同じ高さなら追う",
  theme: "同一rowの直接追跡を利用し、正面衝突を避けるため梯子へ逃がしてからGoalへ落下する",
  tiles: [
    "#############",
    "#           #",
    "#  HE    H  #",
    "###H#####H###",
    "#  H     H  #",
    "#  H     H  #",
    "#  H     H  #",
    "#  H     H  #",
    "#############",
  ],
  player: { x: 1, y: 2 },
  guards: [{ x: 6, y: 2 }],
  knownSolution: [Action.RIGHT, Action.RIGHT, Action.UP, Action.RIGHT, Action.RIGHT],
};

export const lureFirstStage = {
  id: "lure-first",
  title: "一度引きつける",
  theme: "Goalへ直行する前に逆方向へ1手動き、Guardを左梯子へ落としてから登る",
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
  guards: [{ x: 3, y: 2 }],
  knownSolution: [
    Action.LEFT, Action.RIGHT, Action.RIGHT,
    Action.UP, Action.UP, Action.UP, Action.UP, Action.UP,
    Action.RIGHT, Action.RIGHT, Action.RIGHT,
  ],
};

export const waitSyncStage = {
  id: "wait-sync",
  title: "待ってずらす",
  theme: "WAITでGuardを1cell動かしてから進むことで、同じ経路を安全に通過する",
  tiles: [
    "#############",
    "#  E        #",
    "#  H     H  #",
    "###H#####H###",
    "#  H     H  #",
    "#  H     H  #",
    "#  H     H  #",
    "#  H     H  #",
    "#############",
  ],
  player: { x: 9, y: 1 },
  guards: [{ x: 8, y: 2 }],
  knownSolution: [
    Action.WAIT,
    Action.LEFT, Action.LEFT, Action.LEFT, Action.LEFT,
    Action.LEFT, Action.LEFT, Action.LEFT,
    Action.UP,
  ],
};

export const leftTieQuirkStage = {
  id: "left-tie-quirk",
  title: "近い梯子へ行かない",
  theme: "左右候補が同評価のとき固定列挙順で左側が選ばれるAIの癖を利用する",
  tiles: [
    "#############",
    "#           #",
    "#  H     H E#",
    "###H#####H###",
    "#  H     H  #",
    "#  H     H  #",
    "#  H     H  #",
    "#  H     H  #",
    "#############",
  ],
  player: { x: 8, y: 7 },
  guards: [{ x: 6, y: 2 }],
  knownSolution: [
    Action.RIGHT,
    Action.UP, Action.UP, Action.UP, Action.UP, Action.UP,
    Action.RIGHT, Action.RIGHT,
  ],
};

export const gatekeeperWaitStage = {
  id: "gatekeeper-wait",
  title: "すれ違い",
  theme: "Goalへ直行せずGuardを左へ十分に引きつけ、WAITで時間差を作って上段から反対側へ回り込む",
  tiles: [
    "#############",
    "#           #",
    "#  H  H     #",
    "###H##H######",
    "###H##H######",
    "#  H  H E   #",
    "#############",
    "#############",
    "#############",
  ],
  player: { x: 4, y: 5 },
  guards: [{ x: 7, y: 5 }],
  knownSolution: [
    Action.LEFT,
    Action.WAIT,
    Action.UP, Action.UP, Action.UP,
    Action.RIGHT, Action.RIGHT, Action.RIGHT,
    Action.DOWN, Action.DOWN, Action.DOWN,
    Action.RIGHT, Action.RIGHT,
  ],
};

export const goldOutAndBackStage = {
  id: "gold-out-and-back",
  title: "反転する目標",
  theme: "Gold取得後にGuardを右へ再誘導してから左のGoalへ戻る",
  tiles: [
    "#############",
    "#           #",
    "#E H  H  H  #",
    "###H##H##H###",
    "###H##H##H###",
    "#  H  H  H  #",
    "#############",
    "#############",
    "#############",
  ],
  player: { x: 4, y: 5 },
  guards: [{ x: 7, y: 5 }],
  gold: [{ x: 5, y: 2 }],
  knownSolution: [
    Action.LEFT, Action.LEFT, Action.RIGHT,
    Action.UP, Action.UP, Action.UP,
    Action.RIGHT, Action.RIGHT, Action.RIGHT,
    Action.UP, Action.LEFT, Action.LEFT,
    Action.LEFT, Action.LEFT, Action.LEFT, Action.LEFT,
  ],
};

export const lureIntoHoleStage = {
  id: "lure-into-hole",
  title: "進路の先に",
  theme: "Guardの追跡を読み、穴へ誘導して頭上を渡る",
  tiles: [
    "#############",
    "#############",
    "#############",
    "#############",
    "#############",
    "###      E###",
    "#############",
    "#############",
    "#############",
  ],
  player: { x: 4, y: 5 },
  guards: [{ x: 8, y: 5 }],
  knownSolution: [
    Action.DIG_RIGHT,
    Action.WAIT, Action.WAIT, Action.WAIT,
    Action.RIGHT, Action.RIGHT, Action.RIGHT, Action.RIGHT, Action.RIGHT,
  ],
};

export const stages = [
  sameRowChaseStage,
  sampleStage,
  lureFirstStage,
  waitSyncStage,
  leftTieQuirkStage,
  gatekeeperWaitStage,
  goldOutAndBackStage,
  lureIntoHoleStage,
  selectorSmokeStage,
];
