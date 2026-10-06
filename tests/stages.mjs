import assert from "node:assert/strict";
import { Action } from "../src/core/actions.js";
import { createSampleState } from "../src/core/state.js";
import { step } from "../src/core/step.js";
import {
  leftTieQuirkStage,
  gatekeeperWaitStage,
  lureFirstStage,
  sameRowChaseStage,
  selectorSmokeStage,
  stages,
  waitSyncStage,
} from "../src/stages.js";

assert.ok(stages.length > 0, "stage catalog must not be empty");

const ids = new Set();
const actionValues = new Set(Object.values(Action));

for (const stage of stages) {
  assert.equal(typeof stage.id, "string", "stage id must be a string");
  assert.ok(stage.id.trim().length > 0, "stage id must not be empty");
  assert.ok(!ids.has(stage.id), `duplicate stage id: ${stage.id}`);
  ids.add(stage.id);

  assert.equal(typeof stage.title, "string", `${stage.id}: title must be a string`);
  assert.ok(stage.title.trim().length > 0, `${stage.id}: title must not be empty`);
  assert.equal(typeof stage.theme, "string", `${stage.id}: theme must be a string`);
  assert.ok(stage.theme.trim().length > 0, `${stage.id}: theme must not be empty`);

  assert.ok(Array.isArray(stage.tiles) && stage.tiles.length > 0,
    `${stage.id}: tiles must contain rows`);
  const width = stage.tiles[0].length;
  assert.ok(width > 0, `${stage.id}: tile rows must not be empty`);
  for (const [rowIndex, row] of stage.tiles.entries()) {
    assert.equal(typeof row, "string", `${stage.id}: row ${rowIndex} must be a string`);
    assert.equal(row.length, width, `${stage.id}: tile rows must be rectangular`);
  }

  assert.ok(Array.isArray(stage.knownSolution) && stage.knownSolution.length > 0,
    `${stage.id}: knownSolution must not be empty`);
  for (const [actionIndex, action] of stage.knownSolution.entries()) {
    assert.ok(actionValues.has(action),
      `${stage.id}: knownSolution[${actionIndex}] must be a Core Action`);
  }

  let state = createSampleState(stage);
  for (const [actionIndex, action] of stage.knownSolution.entries()) {
    const result = step(state, action);
    assert.notEqual(result.kind, "rejected",
      `${stage.id}: knownSolution[${actionIndex}] was rejected`);
    assert.notEqual(result.kind, "terminal",
      `${stage.id}: knownSolution[${actionIndex}] ran after a terminal state`);
    if (actionIndex < stage.knownSolution.length - 1) {
      assert.equal(result.state.status, "playing",
        `${stage.id}: knownSolution became ${result.state.status} before its final action`);
    }
    state = result.state;
  }
  assert.equal(state.status, "won", `${stage.id}: knownSolution must finish won`);
}

const sample = stages.find(({ id }) => id === "two-ladders");
assert.ok(sample, "catalog must contain the migrated sampleStage");
assert.deepEqual(sample.knownSolution, [
  Action.RIGHT,
  Action.UP, Action.UP, Action.UP, Action.UP, Action.UP,
  Action.RIGHT, Action.RIGHT, Action.RIGHT,
]);

const validationStages = [
  sameRowChaseStage,
  sample,
  lureFirstStage,
  waitSyncStage,
  leftTieQuirkStage,
  gatekeeperWaitStage,
];
assert.deepEqual(validationStages.map(({ id }) => id), [
  "same-row-chase",
  "two-ladders",
  "lure-first",
  "wait-sync",
  "left-tie-quirk",
  "gatekeeper-wait",
]);
assert.deepEqual(stages.map(({ id }) => id), [
  "same-row-chase",
  "two-ladders",
  "lure-first",
  "wait-sync",
  "left-tie-quirk",
  "gatekeeper-wait",
  "selector-smoke",
]);
const expectedSolutions = new Map([
  [sameRowChaseStage.id, [Action.RIGHT, Action.RIGHT, Action.UP, Action.RIGHT, Action.RIGHT]],
  [sample.id, [
    Action.RIGHT,
    Action.UP, Action.UP, Action.UP, Action.UP, Action.UP,
    Action.RIGHT, Action.RIGHT, Action.RIGHT,
  ]],
  [lureFirstStage.id, [
    Action.LEFT, Action.RIGHT, Action.RIGHT,
    Action.UP, Action.UP, Action.UP, Action.UP, Action.UP,
    Action.RIGHT, Action.RIGHT, Action.RIGHT,
  ]],
  [waitSyncStage.id, [
    Action.WAIT,
    Action.LEFT, Action.LEFT, Action.LEFT, Action.LEFT,
    Action.LEFT, Action.LEFT, Action.LEFT,
    Action.UP,
  ]],
  [leftTieQuirkStage.id, [
    Action.RIGHT,
    Action.UP, Action.UP, Action.UP, Action.UP, Action.UP,
    Action.RIGHT, Action.RIGHT,
  ]],
  [gatekeeperWaitStage.id, [
    Action.LEFT, Action.WAIT,
    Action.UP, Action.UP, Action.UP,
    Action.RIGHT, Action.RIGHT, Action.RIGHT,
    Action.DOWN, Action.DOWN, Action.DOWN,
    Action.RIGHT, Action.RIGHT,
  ]],
]);

const expectedInitialStates = new Map([
  ["same-row-chase", { player: { x: 1, y: 2 }, guards: [{ x: 6, y: 2 }] }],
  ["two-ladders", { player: { x: 2, y: 7 }, guards: [{ x: 10, y: 7 }] }],
  ["lure-first", { player: { x: 2, y: 7 }, guards: [{ x: 3, y: 2 }] }],
  ["wait-sync", { player: { x: 9, y: 1 }, guards: [{ x: 8, y: 2 }] }],
  ["left-tie-quirk", { player: { x: 8, y: 7 }, guards: [{ x: 6, y: 2 }] }],
  ["gatekeeper-wait", { player: { x: 4, y: 5 }, guards: [{ x: 7, y: 5 }] }],
]);
const solutionResults = new Map();
for (const stage of validationStages) {
  assert.deepEqual(stage.knownSolution, expectedSolutions.get(stage.id),
    `${stage.id}: knownSolution must match the designed sequence`);
  assert.equal(stage.tiles.length, 9, `${stage.id}: stage height must be 9`);
  assert.ok(stage.tiles.every((row) => row.length === 13),
    `${stage.id}: every row must be 13 cells wide`);
  assert.equal(stage.guards.length, 1, `${stage.id}: validation stage must have one Guard`);
  assert.deepEqual(
    { player: stage.player, guards: stage.guards },
    expectedInitialStates.get(stage.id),
    `${stage.id}: initial actors must match the designed stage`,
  );

  let state = createSampleState(stage);
  const results = [];
  for (const action of stage.knownSolution) {
    const result = step(state, action);
    results.push(result);
    state = result.state;
  }
  solutionResults.set(stage.id, results);
}

const sameRowResults = solutionResults.get(sameRowChaseStage.id);
assert.equal(sameRowResults[0].guardDecision.direction, "left");
assert.equal(sameRowResults[1].guardDecision.direction, "left");
assert.equal(sameRowResults.at(-1).kind, "forced");
assert.equal(sameRowResults.at(-1).state.status, "won");

const lureResults = solutionResults.get(lureFirstStage.id);
assert.equal(lureFirstStage.knownSolution[0], Action.LEFT);
assert.deepEqual(lureResults[0].state.guards[0], { x: 3, y: 3 });
assert.deepEqual(lureResults[1].state.guards[0], { x: 3, y: 4 });
assert.deepEqual(lureResults[2].state.guards[0], { x: 2, y: 4 });
assert.equal(lureResults.at(-1).state.status, "won");

const waitResults = solutionResults.get(waitSyncStage.id);
assert.equal(waitSyncStage.knownSolution[0], Action.WAIT);
assert.deepEqual(waitResults[0].state.guards[0], { x: 9, y: 2 });
assert.equal(waitResults[2].kind, "forced");
assert.deepEqual(waitResults[2].state.player, { x: 8, y: 2 });
assert.deepEqual(waitResults[2].state.guards[0], { x: 9, y: 2 });
assert.equal(waitResults.at(-1).state.status, "won");

const tieResults = solutionResults.get(leftTieQuirkStage.id);
assert.deepEqual(tieResults.slice(0, 3).map(({ guardDecision }) => guardDecision.direction),
  ["left", "left", "left"]);
assert.equal(tieResults[3].guardDecision.direction, "down");
assert.equal(tieResults.at(-1).state.status, "won");

const gatekeeperResults = solutionResults.get(gatekeeperWaitStage.id);
assert.equal(gatekeeperWaitStage.tiles.length, 9);
assert.ok(gatekeeperWaitStage.tiles.every((row) => row.length === 13));
assert.equal(gatekeeperWaitStage.guards.length, 1);
assert.deepEqual(gatekeeperResults.map(({ state }) => ({ player: state.player, guard: state.guards[0] }))[0], {
  player: { x: 3, y: 5 }, guard: { x: 6, y: 5 },
});
assert.deepEqual(gatekeeperResults[1].state.guards[0], { x: 5, y: 5 });
assert.deepEqual(gatekeeperResults[4].state.player, { x: 3, y: 2 });
assert.deepEqual(gatekeeperResults[4].state.guards[0], { x: 3, y: 4 });
assert.deepEqual(gatekeeperResults[7].state.player, { x: 6, y: 2 });
assert.deepEqual(gatekeeperResults[7].state.guards[0], { x: 4, y: 2 });
assert.deepEqual(gatekeeperResults[10].state.player, { x: 6, y: 5 });
assert.deepEqual(gatekeeperResults[10].state.guards[0], { x: 3, y: 4 });
assert.equal(gatekeeperResults.length, 13);
assert.equal(gatekeeperResults.at(-1).state.status, "won");

function replay(stage, actions) {
  let state = createSampleState(stage);
  const results = [];
  for (const action of actions) {
    const result = step(state, action);
    results.push(result);
    state = result.state;
    if (state.status !== "playing") break;
  }
  return results;
}

const directResults = replay(gatekeeperWaitStage, [Action.RIGHT, Action.RIGHT]);
assert.equal(directResults.length, 2);
assert.equal(directResults.at(-1).state.status, "lost");

const withoutWaitResults = replay(gatekeeperWaitStage, [
  Action.LEFT,
  Action.UP, Action.UP, Action.UP,
  Action.RIGHT, Action.RIGHT,
]);
assert.equal(withoutWaitResults.length, 6);
assert.equal(withoutWaitResults.at(-1).state.status, "lost");

assert.ok(stages.includes(selectorSmokeStage), "catalog must contain the selector smoke fixture");
assert.equal(selectorSmokeStage.tiles.length, 9);
assert.ok(selectorSmokeStage.tiles.every((row) => row.length === 13));
assert.deepEqual(selectorSmokeStage.player, { x: 1, y: 7 });
assert.deepEqual(selectorSmokeStage.guards, []);
assert.deepEqual(selectorSmokeStage.knownSolution, Array(10).fill(Action.RIGHT));
assert.match(selectorSmokeStage.theme, /smoke fixture/i);
assert.match(selectorSmokeStage.theme, /Guard誘導の評価には使わない/);

const sampleState = createSampleState(sample);
for (const metadataKey of ["id", "title", "theme", "knownSolution"]) {
  assert.equal(metadataKey in sampleState, false,
    `stage metadata ${metadataKey} must not enter GameState`);
}

console.log("Stage catalog validation passed.");
