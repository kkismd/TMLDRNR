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

export const stages = [sampleStage];
