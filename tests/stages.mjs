import assert from "node:assert/strict";
import { Action } from "../src/core/actions.js";
import { createSampleState } from "../src/core/state.js";
import { step } from "../src/core/step.js";
import {
  leftTieQuirkStage,
  goldOutAndBackStage,
  gatekeeperWaitStage,
  lureIntoHoleStage,
  lureFirstStage,
  sameRowChaseStage,
  selectorSmokeStage,
  stages,
  waitSyncStage,
} from "../src/stages.js";

assert.ok(stages.length > 0, "stage catalog must not be empty");

const ids = new Set();
const actionValues = new Set(Object.values(Action));

function validateGold(stage) {
  if (stage.gold === undefined) return;
  assert.ok(Array.isArray(stage.gold), `${stage.id}: gold must be an array`);
  const occupied = new Set([
    `${stage.player.x},${stage.player.y}`,
    ...stage.guards.map(({ x, y }) => `${x},${y}`),
  ]);
  const seen = new Set();
  const goals = new Set();
  for (const [y, row] of stage.tiles.entries()) {
    for (const [x, tile] of [...row].entries()) {
      if (tile === "E") goals.add(`${x},${y}`);
    }
  }
  for (const [index, position] of stage.gold.entries()) {
    assert.ok(position && Number.isInteger(position.x) && Number.isInteger(position.y),
      `${stage.id}: gold[${index}] must be a position`);
    const { x, y } = position;
    const key = `${x},${y}`;
    assert.ok(x >= 0 && y >= 0 && y < stage.tiles.length && x < stage.tiles[0].length,
      `${stage.id}: gold[${index}] must be in bounds`);
    assert.notEqual(stage.tiles[y][x], "#", `${stage.id}: gold[${index}] must be traversable`);
    assert.ok(!seen.has(key), `${stage.id}: gold positions must be unique`);
    assert.ok(!occupied.has(key), `${stage.id}: gold cannot overlap an initial actor`);
    assert.ok(!goals.has(key), `${stage.id}: gold cannot overlap a Goal`);
    seen.add(key);
  }
}

for (const stage of stages) {
  validateGold(stage);
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

const goldValidationBase = {
  id: "gold-validation",
  tiles: ["######", "# E  #", "######"],
  player: { x: 1, y: 1 },
  guards: [{ x: 4, y: 1 }],
};
for (const invalidGold of [
  "not-an-array",
  [{ x: 2, y: 0 }],
  [{ x: 6, y: 1 }],
  [{ x: 0, y: 1 }],
  [{ x: 2, y: 1 }],
  [{ x: 1, y: 1 }],
  [{ x: 4, y: 1 }],
  [{ x: 3, y: 1 }, { x: 3, y: 1 }],
]) {
  assert.throws(() => validateGold({ ...goldValidationBase, gold: invalidGold }));
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
  goldOutAndBackStage,
  lureIntoHoleStage,
];
assert.deepEqual(validationStages.map(({ id }) => id), [
  "same-row-chase",
  "two-ladders",
  "lure-first",
  "wait-sync",
  "left-tie-quirk",
  "gatekeeper-wait",
  "gold-out-and-back",
  "lure-into-hole",
]);
assert.deepEqual(stages.map(({ id }) => id), [
  "same-row-chase",
  "two-ladders",
  "lure-first",
  "wait-sync",
  "left-tie-quirk",
  "gatekeeper-wait",
  "gold-out-and-back",
  "lure-into-hole",
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
  [goldOutAndBackStage.id, [
    Action.LEFT, Action.LEFT, Action.RIGHT,
    Action.UP, Action.UP, Action.UP,
    Action.RIGHT, Action.RIGHT, Action.RIGHT,
    Action.UP, Action.LEFT, Action.LEFT,
    Action.LEFT, Action.LEFT, Action.LEFT, Action.LEFT,
  ]],
  [lureIntoHoleStage.id, [
    Action.DIG_RIGHT,
    Action.WAIT, Action.WAIT,
    Action.RIGHT, Action.RIGHT, Action.RIGHT, Action.RIGHT, Action.RIGHT,
  ]],
]);

const expectedInitialStates = new Map([
  ["same-row-chase", { player: { x: 1, y: 2 }, guards: [{ x: 6, y: 2 }] }],
  ["two-ladders", { player: { x: 2, y: 7 }, guards: [{ x: 10, y: 7 }] }],
  ["lure-first", { player: { x: 2, y: 7 }, guards: [{ x: 3, y: 2 }] }],
  ["wait-sync", { player: { x: 9, y: 1 }, guards: [{ x: 8, y: 2 }] }],
  ["left-tie-quirk", { player: { x: 8, y: 7 }, guards: [{ x: 6, y: 2 }] }],
  ["gatekeeper-wait", { player: { x: 4, y: 5 }, guards: [{ x: 7, y: 5 }] }],
  ["gold-out-and-back", { player: { x: 4, y: 5 }, guards: [{ x: 7, y: 5 }] }],
  ["lure-into-hole", { player: { x: 4, y: 5 }, guards: [{ x: 8, y: 5 }] }],
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

assert.equal(goldOutAndBackStage.tiles.length, 9);
assert.ok(goldOutAndBackStage.tiles.every((row) => row.length === 13));
assert.deepEqual(goldOutAndBackStage.gold, [{ x: 5, y: 2 }]);
assert.equal(goldOutAndBackStage.knownSolution.length, 16);
const goldResults = solutionResults.get(goldOutAndBackStage.id);
const expectedGoldStates = new Map([
  [3, { player: { x: 3, y: 5 }, guard: { x: 4, y: 5 } }],
  [6, { player: { x: 3, y: 2 }, guard: { x: 3, y: 3 } }],
  [8, { player: { x: 5, y: 2 }, guard: { x: 4, y: 2 }, gold: [] }],
  [10, { player: { x: 6, y: 1 }, guard: { x: 6, y: 2 } }],
  [12, { player: { x: 5, y: 2 }, guard: { x: 6, y: 2 } }],
  [16, { player: { x: 1, y: 2 }, guard: { x: 3, y: 2 }, status: "won" }],
]);
for (const [turn, expected] of expectedGoldStates) {
  const state = goldResults[turn - 1].state;
  assert.deepEqual({
    player: state.player,
    guard: state.guards[0],
    ...(turn === 8 ? { gold: state.gold } : {}),
    ...(turn === 16 ? { status: state.status } : {}),
  }, expected, `gold-out-and-back: unexpected state at turn ${turn}`);
}
assert.equal(goldResults[11].kind, "forced");
assert.ok(goldResults.every(({ kind }) => kind !== "rejected" && kind !== "terminal"));

assert.equal(lureIntoHoleStage.knownSolution.length, 8);
assert.deepEqual(lureIntoHoleStage.gold ?? [], []);
assert.equal(lureIntoHoleStage.tiles[5], "###      E###");
assert.equal(9 - 3 + 1, 7); // Horizontal encounter segment x=3..9.
assert.equal(lureIntoHoleStage.guards[0].x - lureIntoHoleStage.player.x, 4);
assert.equal(step(createSampleState(lureIntoHoleStage), Action.DIG_RIGHT).kind, "accepted");
assert.equal(step(createSampleState(lureIntoHoleStage), Action.DIG_LEFT).kind, "accepted");
const lureIntoHoleResults = solutionResults.get(lureIntoHoleStage.id);
assert.deepEqual(lureIntoHoleResults[0].state.player, { x: 4, y: 5 });
assert.deepEqual(lureIntoHoleResults[0].state.guards[0], { x: 7, y: 5 });
assert.deepEqual(lureIntoHoleResults[0].state.holes, [{ x: 5, y: 6, remaining: 6 }]);
assert.deepEqual(lureIntoHoleResults[1].state.guards[0], { x: 6, y: 5 });
assert.deepEqual(lureIntoHoleResults[2].state.guards[0], { x: 5, y: 6 });
assert.deepEqual(lureIntoHoleResults[2].state.holes[0].trap,
  { guardIndex: 0, phase: "trapped", remaining: 3 });
assert.deepEqual(lureIntoHoleResults[3].state.player, { x: 5, y: 5 });
assert.equal(lureIntoHoleResults[3].state.holes[0].trap.remaining, 2);
assert.deepEqual(lureIntoHoleResults[4].state.player, { x: 6, y: 5 });
assert.equal(lureIntoHoleResults[4].state.holes[0].trap.remaining, 1);
assert.deepEqual(lureIntoHoleResults[5].state.player, { x: 7, y: 5 });
assert.deepEqual(lureIntoHoleResults[5].state.holes[0].trap,
  { guardIndex: 0, phase: "climbing" });
assert.deepEqual(lureIntoHoleResults[6].state.player, { x: 8, y: 5 });
assert.deepEqual(lureIntoHoleResults[6].state.guards[0], { x: 5, y: 5 });
assert.deepEqual(lureIntoHoleResults[6].state.holes, []);
assert.deepEqual(lureIntoHoleResults[7].state.player, { x: 9, y: 5 });
assert.equal(lureIntoHoleResults[7].state.status, "won");

const directLureResults = replay(lureIntoHoleStage, [Action.RIGHT, Action.RIGHT]);
assert.equal(directLureResults.at(-1).state.status, "lost");
assert.equal(directLureResults.at(-1).state.turn, 2);
const wrongSideDig = replay(lureIntoHoleStage, [Action.DIG_LEFT]);
assert.equal(wrongSideDig[0].kind, "accepted");
assert.deepEqual(wrongSideDig[0].state.guards[0], { x: 7, y: 5 });
assert.deepEqual(wrongSideDig[0].state.holes, [{ x: 3, y: 6, remaining: 6 }]);
assert.equal(wrongSideDig[0].state.holes[0].trap, undefined);

const goldDirectResults = replay(goldOutAndBackStage,
  goldOutAndBackStage.knownSolution.slice(0, 8).concat(Action.LEFT));
assert.equal(goldDirectResults.length, 9);
assert.equal(goldDirectResults.at(-1).state.status, "lost");

const sameRowResults = solutionResults.get(sameRowChaseStage.id);
assert.equal(sameRowResults[0].guardDecision.direction, "left");
assert.equal(sameRowResults[1].guardDecision.direction, "left");
assert.equal(sameRowResults.at(-1).kind, "forced");
assert.equal(sameRowResults.at(-1).state.status, "won");

const lureResults = solutionResults.get(lureFirstStage.id);
assert.equal(lureFirstStage.knownSolution[0], Action.LEFT);
assert.deepEqual(lureResults[0].state.guards[0], { x: 3, y: 3 });
assert.deepEqual(lureResults[1].state.guards[0], { x: 3, y: 4 });
assert.deepEqual(lureResults[2].state.guards[0], { x: 2, y: 5 });
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
