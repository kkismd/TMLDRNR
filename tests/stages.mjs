import assert from "node:assert/strict";
import { Action } from "../src/core/actions.js";
import { createSampleState } from "../src/core/state.js";
import { step } from "../src/core/step.js";
import {
  leftTieQuirkStage,
  goldOutAndBackStage,
  gatekeeperWaitStage,
  integratedRouteStage,
  lureIntoHoleStage,
  lureFirstStage,
  sameRowChaseStage,
  selectorSmokeStage,
  stages,
  twoAreaRoundTripStage,
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

function replayKnownSolution(stage) {
  let state = createSampleState(stage);
  const results = [];
  for (const action of stage.knownSolution) {
    if (state.status !== "playing") break;
    const result = step(state, action);
    results.push(result);
    if (result.kind === "rejected") break;
    state = result.state;
  }
  return { state, results };
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

  assert.deepEqual(replayKnownSolution(stage), replayKnownSolution(stage),
    `${stage.id}: knownSolution replay must remain deterministic`);
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
  integratedRouteStage,
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
  "integrated-route",
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
  "integrated-route",
  "two-area-round-trip",
  "selector-smoke",
]);
const expectedSolutions = new Map([
  [sameRowChaseStage.id, [Action.RIGHT, Action.RIGHT, Action.UP, Action.RIGHT, Action.WAIT]],
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
    Action.LEFT, Action.WAIT,
    Action.LEFT, Action.LEFT, Action.LEFT, Action.LEFT, Action.LEFT,
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
    Action.UP, Action.LEFT, Action.WAIT,
    Action.LEFT, Action.LEFT, Action.LEFT, Action.LEFT,
  ]],
  [lureIntoHoleStage.id, [
    Action.DIG_RIGHT,
    Action.WAIT, Action.WAIT, Action.WAIT,
    Action.RIGHT, Action.RIGHT, Action.RIGHT, Action.RIGHT, Action.RIGHT,
  ]],
  [integratedRouteStage.id, [
    Action.RIGHT, Action.RIGHT,
    Action.DIG_RIGHT,
    Action.RIGHT, Action.WAIT, Action.WAIT,
    Action.RIGHT,
    Action.DIG_RIGHT, Action.WAIT,
    Action.RIGHT, Action.RIGHT, Action.RIGHT,
    Action.UP, Action.UP, Action.UP, Action.UP, Action.UP,
    Action.LEFT, Action.LEFT,
    Action.DOWN, Action.WAIT, Action.WAIT,
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
  ["integrated-route", { player: { x: 2, y: 4 }, guards: [{ x: 11, y: 4 }] }],
]);
for (const stage of validationStages) {
  assert.deepEqual(stage.knownSolution, expectedSolutions.get(stage.id),
    `${stage.id}: knownSolution must match the designed sequence`);
  assert.equal(stage.tiles.length, 9, `${stage.id}: stage height must be 9`);
  assert.ok(stage.tiles.every((row) => row.length === 13),
    `${stage.id}: every row must be 13 cells wide`);
  assert.equal(stage.guards.length, 1, `${stage.id}: validation stage must have one Guard`);
  assert.deepEqual({ player: stage.player, guards: stage.guards }, expectedInitialStates.get(stage.id),
    `${stage.id}: initial actors must match the designed stage`);

  const { state, results } = replayKnownSolution(stage);
  assert.equal(results.length, stage.knownSolution.length,
    `${stage.id}: knownSolution must be fully consumed`);
  assert.ok(results.every(({ kind }) => kind === "accepted"),
    `${stage.id}: knownSolution must contain no rejected or terminal action`);
  assert.equal(state.status, "won", `${stage.id}: knownSolution must clear the stage`);
}

assert.equal(goldOutAndBackStage.tiles.length, 9);
assert.ok(goldOutAndBackStage.tiles.every((row) => row.length === 13));
assert.deepEqual(goldOutAndBackStage.gold, [{ x: 5, y: 2 }]);
assert.equal(goldOutAndBackStage.knownSolution.length, 16);
assert.equal(lureIntoHoleStage.knownSolution.length, 9);
assert.equal(integratedRouteStage.knownSolution.length, 22);

assert.equal(twoAreaRoundTripStage.tiles.length, 11);
assert.ok(twoAreaRoundTripStage.tiles.every((row) => row.length === 15));
assert.deepEqual(twoAreaRoundTripStage.tiles, [
  "###############",
  "#   -----H    #",
  "#        H    #",
  "#    H   H    #",
  "#   EH   H    #",
  "#####H###H#####",
  "#    H   H    #",
  "#    H   H    #",
  "#    H   H    #",
  "###############",
  "###############",
]);
assert.deepEqual(twoAreaRoundTripStage.player, { x: 2, y: 4 });
assert.deepEqual(twoAreaRoundTripStage.guards, [{ x: 12, y: 4 }, { x: 1, y: 8 }],
  "two-area-round-trip: Guard index 0 is A and index 1 is B");
assert.deepEqual(twoAreaRoundTripStage.gold, [{ x: 11, y: 8 }]);
assert.deepEqual([...twoAreaRoundTripStage.tiles.entries()]
  .flatMap(([y, row]) => [...row].flatMap((tile, x) => tile === "E" ? [{ x, y }] : [])),
[{ x: 4, y: 4 }]);
assert.equal(twoAreaRoundTripStage.knownSolution.length, 35);
assert.deepEqual(twoAreaRoundTripStage.knownSolution, [
  Action.RIGHT, Action.RIGHT, Action.RIGHT, Action.DIG_RIGHT, Action.RIGHT,
  Action.WAIT, Action.WAIT, Action.WAIT, Action.WAIT,
  Action.RIGHT, Action.RIGHT, Action.RIGHT, Action.RIGHT, Action.RIGHT,
  Action.DIG_LEFT, Action.WAIT, Action.WAIT, Action.WAIT,
  Action.LEFT, Action.LEFT,
  Action.UP, Action.UP, Action.UP, Action.UP, Action.UP, Action.UP, Action.UP,
  Action.LEFT, Action.LEFT, Action.LEFT, Action.LEFT, Action.LEFT,
  Action.DOWN, Action.WAIT, Action.WAIT,
]);
let roundTripState = createSampleState(twoAreaRoundTripStage);
const roundTripResults = [];
for (const action of twoAreaRoundTripStage.knownSolution) {
  const result = step(roundTripState, action);
  roundTripResults.push(result);
  assert.equal(result.kind, "accepted", `two-area-round-trip: ${action} must be accepted`);
  roundTripState = result.state;
}
assert.equal(roundTripState.status, "won");
assert.deepEqual(replayKnownSolution(twoAreaRoundTripStage), replayKnownSolution(twoAreaRoundTripStage),
  "two-area-round-trip: knownSolution replay must remain deterministic");
assert.deepEqual(roundTripResults[6].state.holes[0].trap,
  { guardIndex: 0, phase: "trapped", remaining: 3 },
  "two-area-round-trip: Guard A must enter the first transition hole");
assert.deepEqual(roundTripResults[13].state.player, { x: 11, y: 8 });
assert.deepEqual(roundTripResults[13].state.guards, [{ x: 5, y: 6 }, { x: 7, y: 8 }],
  "two-area-round-trip: turn 14 Guard A has drifted while Guard B pursues");
assert.deepEqual(roundTripResults[13].state.gold, [],
  "two-area-round-trip: turn 14 must collect Gold");
assert.deepEqual(roundTripResults[17].state.guards, [{ x: 5, y: 8 }, { x: 10, y: 9 }]);
assert.deepEqual(roundTripResults[17].state.holes[0].trap,
  { guardIndex: 1, phase: "trapped", remaining: 3 },
  "two-area-round-trip: turn 18 must trap Guard B");
assert.deepEqual(roundTripResults[19].state.player, { x: 9, y: 8 });
assert.deepEqual(roundTripResults[19].state.guards, [{ x: 7, y: 8 }, { x: 10, y: 9 }],
  "two-area-round-trip: turn 20 positions both Guards for the pincer");
assert.deepEqual(roundTripResults[20].state.player, { x: 9, y: 7 },
  "two-area-round-trip: turn 21 uses the x9 ladder to leave the pincer");
assert.deepEqual(roundTripResults[26].state.player, { x: 9, y: 1 });
assert.deepEqual(roundTripResults[31].state.player, { x: 4, y: 1 },
  "two-area-round-trip: upper rope route reaches x4");
assert.deepEqual(roundTripResults[32].state.player, { x: 4, y: 2 },
  "two-area-round-trip: DOWN releases Player from the rope");
assert.deepEqual(roundTripResults[34].state.player, { x: 4, y: 4 },
  "two-area-round-trip: gravity WAITs reach Goal");

let skipGuardBState = createSampleState(twoAreaRoundTripStage);
for (const action of twoAreaRoundTripStage.knownSolution.slice(0, 14).concat([Action.LEFT, Action.LEFT])) {
  const result = step(skipGuardBState, action);
  assert.equal(result.kind, "accepted", "two-area-round-trip: direct return actions are accepted");
  skipGuardBState = result.state;
  if (skipGuardBState.status === "lost") break;
}
assert.equal(skipGuardBState.status, "lost",
  "two-area-round-trip: returning after Gold without trapping Guard B must lose");
assert.deepEqual(skipGuardBState.player, { x: 9, y: 8 });
assert.deepEqual(skipGuardBState.guards[1], { x: 9, y: 8 });

let ignoreGuardAState = roundTripResults[19].state;
const wrongRoute = step(ignoreGuardAState, Action.LEFT);
assert.equal(wrongRoute.kind, "accepted");
assert.equal(wrongRoute.state.status, "lost",
  "two-area-round-trip: lower return after trapping Guard B must lose to Guard A");
assert.deepEqual(wrongRoute.state.player, { x: 8, y: 8 });
assert.deepEqual(wrongRoute.state.guards[0], { x: 8, y: 8 });
assert.deepEqual(integratedRouteStage.gold, [{ x: 5, y: 6 }]);
assert.deepEqual(integratedRouteStage.tiles, [
  "#############",
  "#   -----H  #",
  "#       #H  #",
  "#       #H  #",
  "#     #E#H  #",
  "#########H###",
  "###      H  #",
  "#############",
  "#############",
]);
assert.deepEqual([...integratedRouteStage.tiles.entries()]
  .flatMap(([y, row]) => [...row].flatMap((tile, x) => tile === "E" ? [{ x, y }] : [])),
[{ x: 7, y: 4 }]);
let integratedState = createSampleState(integratedRouteStage);
const integratedResults = [];
for (const action of integratedRouteStage.knownSolution) {
  const result = step(integratedState, action);
  integratedResults.push(result);
  assert.equal(result.kind, "accepted", `integrated-route: ${action} must be accepted`);
  integratedState = result.state;
}
assert.equal(integratedState.status, "won");
assert.deepEqual(integratedResults[2].state.holes[0], { x: 5, y: 5, remaining: 6 },
  "integrated-route: first Dig must open the Player descent route");
assert.deepEqual(integratedResults[5].state.player, { x: 5, y: 6 });
assert.deepEqual(integratedResults[5].state.gold, [],
  "integrated-route: Player must collect Gold in the lower corridor");
assert.deepEqual(integratedResults[8].state.holes[0].trap,
  { guardIndex: 0, phase: "trapped", remaining: 3 },
  "integrated-route: second Dig must trap the Guard");
assert.deepEqual(integratedResults[9].state.player, { x: 7, y: 6 });
assert.deepEqual(integratedResults[9].state.guards, [{ x: 7, y: 7 }],
  "integrated-route: trapped Guard must support Player crossing above it");
assert.deepEqual(integratedResults[16].state.player, { x: 9, y: 1 },
  "integrated-route: Player must return to the upper ladder");
assert.deepEqual(integratedResults[18].state.player, { x: 7, y: 1 },
  "integrated-route: Player must reach the upper rope");
assert.deepEqual(integratedResults[19].state.player, { x: 7, y: 2 },
  "integrated-route: DOWN must release Player from the rope");
assert.deepEqual(integratedResults[21].state.player, { x: 7, y: 4 },
  "integrated-route: gravity WAITs must reach Goal");
assert.deepEqual(replayKnownSolution(integratedRouteStage), replayKnownSolution(integratedRouteStage),
  "integrated-route: knownSolution replay must remain deterministic");

let skippedTrapState = createSampleState(integratedRouteStage);
const withoutGuardTrap = integratedRouteStage.knownSolution.filter((_, index) => index !== 7 && index !== 8);
for (const action of withoutGuardTrap) {
  const result = step(skippedTrapState, action);
  assert.notEqual(result.kind, "rejected",
    "integrated-route: trap omission sequence must be accepted until collision");
  skippedTrapState = result.state;
  if (skippedTrapState.status === "lost") break;
}
assert.equal(skippedTrapState.status, "lost",
  "integrated-route: walking straight without the second Dig must lose to Guard collision");
assert.deepEqual(skippedTrapState.player, { x: 7, y: 6 });
assert.deepEqual(skippedTrapState.guards, [{ x: 7, y: 6 }]);
assert.deepEqual(lureIntoHoleStage.gold ?? [], []);
assert.equal(lureIntoHoleStage.tiles[5], "###      E###");
assert.equal(9 - 3 + 1, 7); // Horizontal encounter segment x=3..9.
assert.equal(lureIntoHoleStage.guards[0].x - lureIntoHoleStage.player.x, 4);
assert.equal(step(createSampleState(lureIntoHoleStage), Action.DIG_RIGHT).kind, "accepted");
assert.equal(step(createSampleState(lureIntoHoleStage), Action.DIG_LEFT).kind, "accepted");
let lureState = createSampleState(lureIntoHoleStage);
for (const action of lureIntoHoleStage.knownSolution.slice(0, 3)) {
  lureState = step(lureState, action).state;
}
assert.deepEqual(lureState.guards[0], { x: 5, y: 5 },
  "lure-into-hole: turn 3 Guard must be on the cell above the active hole");
assert.equal(lureState.holes[0].trap, undefined,
  "lure-into-hole: Guard must remain unsupported and untrapped at turn 3");
lureState = step(lureState, Action.WAIT).state;
assert.deepEqual(lureState.guards[0], { x: 5, y: 6 },
  "lure-into-hole: turn 4 gravity must move Guard into the hole");
assert.deepEqual(lureState.holes[0].trap,
  { guardIndex: 0, phase: "trapped", remaining: 3 },
  "lure-into-hole: Guard must enter the three-turn trap at turn 4");
assert.equal(gatekeeperWaitStage.tiles.length, 9);
assert.ok(gatekeeperWaitStage.tiles.every((row) => row.length === 13));
assert.equal(gatekeeperWaitStage.guards.length, 1);

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
