import assert from "node:assert/strict";
import { Action } from "../src/core/actions.js";
import { createSampleState } from "../src/core/state.js";
import { step } from "../src/core/step.js";
import { formatStageAsMapText, parseMapText } from "../src/map-text.js";
import { blankStage, goldGuardRepositionStage, stages } from "../src/stages.js";

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

assert.deepEqual(stages, [blankStage, goldGuardRepositionStage]);
assert.deepEqual(stages.map(({ id }) => id), ["blank", "gold-guard-reposition"]);
assert.deepEqual(stages.map(({ title }) => title), ["ブランクマップ", "待つことで道を開く"]);

for (const [stage, map] of [[blankStage, blankMap], [goldGuardRepositionStage, goldMap]]) {
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

for (const stage of stages) {
  const state = createSampleState(stage);
  for (const key of ["id", "title", "theme", "knownSolution"]) {
    assert.equal(key in state, false, `stage metadata ${key} must not enter GameState`);
  }
}

console.log("Stage catalog validation passed.");
