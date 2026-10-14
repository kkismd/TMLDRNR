import assert from "node:assert/strict";
import { Action } from "../src/core/actions.js";
import { createSampleState } from "../src/core/state.js";
import { step } from "../src/core/step.js";
import { formatStageAsMapText, parseMapText } from "../src/map-text.js";
import { blankStage, centralLadderStage, goldGuardRepositionStage, stages, terraceDescentStage, twoLaddersStage } from "../src/stages.js";

const blankMap = [
  "#############", "#           #", "#           #", "#           #",
  "#           #", "#           #", "#           #", "#P         E#",
  "#############",
];
const goldMap = [
  "#############", "#           #", "#EP  -----H #", "##XX##  XXH##",
  "#  H $    H #", "###H##  ##H##", "#  HG  G  H #",
  "#############", "#############",
];
const terraceMap = [
  "#############",
  "#           #",
  "# P H   E   #",
  "###H###H#####",
  "#  H   H G  #",
  "#  ### H ####",
  "#    $ H    #",
  "#XXXXXXXXXXX#",
  "#############",
];
const twoLaddersMap = [
  "#############",
  "#   ---     #",
  "#PEH   H  G #",
  "###HXXXH#####",
  "#  H   H    #",
  "#  H## H##  #",
  "#  H   H   $#",
  "#XXXXXXXXXXX#",
  "#############",
];
const centralLadderMap = [
  "#############",
  "#           #",
  "#           #",
  "# G$P       #",
  "# # ####H##H#",
  "#       H  H#",
  "#       H EH#",
  "##      H GH#",
  "##XXXXXXXXX##",
];

assert.deepEqual(stages, [blankStage, goldGuardRepositionStage, terraceDescentStage, twoLaddersStage, centralLadderStage]);
assert.deepEqual(stages.map(({ id }) => id), ["blank", "gold-guard-reposition", "terrace-descent", "two-ladders", "central-ladder"]);
assert.deepEqual(stages.map(({ title }) => title), ["ブランクマップ", "上段のロープ", "段丘の足場", "二本の梯子", "中央の梯子"]);

for (const [stage, map] of [[blankStage, blankMap], [goldGuardRepositionStage, goldMap],
  [terraceDescentStage, terraceMap], [twoLaddersStage, twoLaddersMap], [centralLadderStage, centralLadderMap]]) {
  assert.equal(stage.tiles.length, 9);
  assert.ok(stage.tiles.every((row) => row.length === 13));
  const formatted = formatStageAsMapText(stage);
  assert.equal(formatted.ok, true);
  assert.deepEqual(formatted.text.split("\n"), map);
  const parsed = parseMapText(map.join("\n"));
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.stage.tiles, stage.tiles);
  assert.deepEqual(parsed.stage.player, stage.player);
  assert.deepEqual(parsed.stage.guards, stage.guards);
  assert.deepEqual(parsed.stage.gold, stage.gold ?? []);
  assert.deepEqual(parseMapText(formatted.text).stage, parsed.stage);
}

assert.deepEqual(blankStage.player, { x: 1, y: 7 });
assert.deepEqual(blankStage.guards, []);
assert.deepEqual(blankStage.gold ?? [], []);
assert.deepEqual(blankStage.knownSolution, Array(10).fill(Action.RIGHT));
assert.deepEqual(goldGuardRepositionStage.player, { x: 2, y: 2 });
assert.deepEqual(goldGuardRepositionStage.guards, [{ x: 4, y: 6 }, { x: 7, y: 6 }]);
assert.deepEqual(goldGuardRepositionStage.gold, [{ x: 5, y: 4 }]);
assert.deepEqual(goldGuardRepositionStage.knownSolution, [
  Action.RIGHT, Action.DIG_RIGHT, Action.RIGHT, Action.WAIT, Action.WAIT,
  Action.RIGHT, Action.WAIT, Action.RIGHT, Action.WAIT, Action.WAIT,
  Action.RIGHT, Action.RIGHT, Action.RIGHT, Action.RIGHT,
  Action.UP, Action.UP, Action.UP, Action.UP,
  Action.LEFT, Action.LEFT, Action.LEFT, Action.LEFT, Action.LEFT,
  Action.LEFT, Action.LEFT, Action.LEFT, Action.LEFT,
]);
assert.equal(terraceDescentStage.id, "terrace-descent");
assert.equal(terraceDescentStage.title, "段丘の足場");
assert.equal(terraceDescentStage.theme, "中層の床を掘って下層のGoldを回収し、Guardを引きつけながら別の梯子でGoalへ戻る");
assert.deepEqual(terraceDescentStage.player, { x: 2, y: 2 });
assert.deepEqual(terraceDescentStage.guards, [{ x: 9, y: 4 }]);
assert.deepEqual(terraceDescentStage.gold, [{ x: 5, y: 6 }]);
assert.deepEqual(terraceDescentStage.knownSolution, [
  Action.RIGHT, Action.DOWN, Action.DOWN, Action.RIGHT, Action.WAIT, Action.DIG_RIGHT,
  Action.RIGHT, Action.WAIT, Action.WAIT, Action.RIGHT, Action.RIGHT, Action.UP,
  Action.UP, Action.UP, Action.UP, Action.RIGHT,
]);
assert.deepEqual(twoLaddersStage.player, { x: 1, y: 2 });
assert.deepEqual(twoLaddersStage.guards, [{ x: 10, y: 2 }]);
assert.deepEqual(twoLaddersStage.gold, [{ x: 11, y: 6 }]);
assert.deepEqual(twoLaddersStage.tiles, [
  "#############", "#   ---     #", "# EH   H    #", "###HXXXH#####",
  "#  H   H    #", "#  H## H##  #", "#  H   H    #", "#XXXXXXXXXXX#", "#############",
]);
assert.equal(twoLaddersStage.knownSolution.length, 34);
assert.deepEqual(twoLaddersStage.knownSolution, [
  Action.RIGHT, Action.LEFT, Action.RIGHT, Action.RIGHT, Action.WAIT,
  Action.UP, Action.RIGHT, Action.RIGHT, Action.RIGHT, Action.RIGHT,
  Action.RIGHT, Action.WAIT, Action.RIGHT, Action.RIGHT, Action.DIG_LEFT,
  Action.DIG_RIGHT, Action.RIGHT, Action.WAIT, Action.WAIT, Action.WAIT,
  Action.WAIT, Action.LEFT, Action.LEFT, Action.LEFT, Action.LEFT,
  Action.LEFT, Action.LEFT, Action.LEFT, Action.LEFT, Action.UP,
  Action.UP, Action.UP, Action.UP, Action.LEFT,
]);
assert.equal(centralLadderStage.id, "central-ladder");
assert.equal(centralLadderStage.title, "中央の梯子");
assert.deepEqual(centralLadderStage.player, { x: 4, y: 3 });
assert.deepEqual(centralLadderStage.guards, [{ x: 2, y: 3 }, { x: 10, y: 7 }]);
assert.deepEqual(centralLadderStage.gold, [{ x: 3, y: 3 }]);
assert.deepEqual(centralLadderStage.tiles, [
  "#############", "#           #", "#           #", "#           #",
  "# # ####H##H#", "#       H  H#", "#       H EH#", "##      H  H#", "##XXXXXXXXX##",
]);
assert.deepEqual(centralLadderStage.knownSolution, [
  Action.RIGHT, Action.LEFT, Action.WAIT, Action.LEFT,
  Action.WAIT, Action.WAIT, Action.WAIT,
  Action.RIGHT, Action.RIGHT, Action.RIGHT, Action.RIGHT, Action.RIGHT, Action.RIGHT,
  Action.WAIT, Action.RIGHT, Action.RIGHT, Action.UP, Action.LEFT,
]);

function replay(stage) {
  let state = createSampleState(stage);
  const states = [];
  for (const action of stage.knownSolution) {
    const result = step(state, action);
    assert.equal(result.kind, "accepted", `${stage.id}: ${action} must be accepted`);
    state = result.state;
    states.push(state);
  }
  return { state, states };
}

const blankReplay = replay(blankStage);
assert.equal(blankReplay.states.length, 10);
assert.equal(blankReplay.state.status, "won");
const goldReplay = replay(goldGuardRepositionStage);
assert.equal(goldReplay.states.length, 27);
assert.deepEqual(goldReplay.states[5].gold, [], "sixth accepted action collects Gold");
assert.deepEqual(goldReplay.states[17].player, { x: 10, y: 2 });
assert.equal(goldReplay.state.status, "won");
assert.deepEqual(goldReplay, replay(goldGuardRepositionStage), "replay must be deterministic");
const terraceReplay = replay(terraceDescentStage);
assert.equal(terraceReplay.states.length, 16);
assert.deepEqual(terraceReplay.states[8].gold, [], "ninth accepted action collects Gold");
assert.deepEqual(terraceReplay.states[10].player, { x: 7, y: 6 });
assert.deepEqual(terraceReplay.states[10].guards, [{ x: 6, y: 6 }]);
assert.deepEqual(terraceReplay.states[14].player, { x: 7, y: 2 });
assert.deepEqual(terraceReplay.states[14].guards, [{ x: 7, y: 3 }]);
assert.equal(terraceReplay.state.status, "won");
assert.deepEqual(terraceReplay, replay(terraceDescentStage), "replay must be deterministic");
const twoLaddersReplay = replay(twoLaddersStage);
assert.equal(twoLaddersReplay.states.length, 34);
assert.deepEqual(twoLaddersReplay.states[20].gold, [], "twenty-first accepted action collects Gold");
assert.deepEqual(twoLaddersReplay.states[33].player, { x: 2, y: 2 });
assert.equal(twoLaddersReplay.state.status, "won");
assert.deepEqual(twoLaddersReplay, replay(twoLaddersStage), "replay must be deterministic");
const centralLadderReplay = replay(centralLadderStage);
assert.equal(centralLadderReplay.states.length, 18);
assert.deepEqual(centralLadderReplay.states[3].gold, [], "fourth accepted action collects Gold");
assert.deepEqual(centralLadderReplay.states[6].player, { x: 3, y: 6 });
assert.deepEqual(centralLadderReplay.states[6].guards[0], { x: 3, y: 7 }, "seventh action places Guard0 below Player");
for (let index = 7; index <= 11; index += 1) {
  assert.deepEqual(centralLadderReplay.states[index].player,
    { x: index - 3, y: 6 }, `${index + 1}th action advances Player right`);
  assert.deepEqual(centralLadderReplay.states[index].guards[0],
    { x: index - 3, y: 7 }, `${index + 1}th action advances supporting Guard right`);
}
assert.deepEqual(centralLadderReplay.states[12].guards[0], { x: 8, y: 6 }, "13th action moves Guard0 up the central ladder");
assert.deepEqual(centralLadderReplay.states[13].player, { x: 9, y: 7 }, "14th WAIT lets Player fall one cell");
assert.equal(centralLadderReplay.state.status, "won");
assert.deepEqual(centralLadderReplay.state.gold, []);
assert.deepEqual(centralLadderReplay, replay(centralLadderStage), "replay must be deterministic");

for (const stage of stages) {
  const state = createSampleState(stage);
  for (const key of ["id", "title", "theme", "knownSolution"]) {
    assert.equal(key in state, false, `stage metadata ${key} must not enter GameState`);
  }
}

console.log("Stage catalog validation passed.");
