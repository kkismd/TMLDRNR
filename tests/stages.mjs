import assert from "node:assert/strict";
import { Action } from "../src/core/actions.js";
import { createSampleState } from "../src/core/state.js";
import { step } from "../src/core/step.js";
import { selectorSmokeStage, stages } from "../src/stages.js";

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
