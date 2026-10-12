import assert from "node:assert/strict";
import { Action } from "../src/core/actions.js";
import { createSampleState } from "../src/core/state.js";
import { isPlayerSupported } from "../src/core/player-step.js";
import { isGuardSupported, isSupported } from "../src/core/terrain.js";
import { step } from "../src/core/step.js";
import { parseMapText } from "../src/map-text.js";
import { createSession } from "../src/web/session.js";

const observedMap = [
  "#############",
  "#           #",
  "#           #",
  "#-----------#",
  "#H        H #",
  "#HP  $   EH #",
  "#GG       H #",
  "#############",
  "#############",
].join("\n");
const parsed = parseMapText(observedMap);
assert.equal(parsed.ok, true);
const observed = createSampleState(parsed.stage);
assert.deepEqual(observed.player, { x: 2, y: 5 });
assert.deepEqual(observed.guards, [{ x: 1, y: 6 }, { x: 2, y: 6 }]);
assert.equal(isSupported(observed), false, "the fixture has no terrain support under Player");
assert.equal(isPlayerSupported(observed), true);
for (const action of [Action.LEFT, Action.RIGHT]) {
  assert.equal(step(observed, action).kind, "accepted", `${action} is legal on the observed fixture`);
}

const actorRows = [
  "#########",
  "#  PH   #",
  "#  GH   #",
  "#########",
];
const supportedByGuard = createSampleState({
  tiles: actorRows,
  player: { x: 3, y: 1 },
  guards: [{ x: 3, y: 2 }],
});
assert.equal(isSupported(supportedByGuard), false);
assert.equal(isPlayerSupported(supportedByGuard), true);
assert.equal(isGuardSupported(supportedByGuard, 0), true,
  "Guard support remains terrain-based");

const first = step(supportedByGuard, Action.WAIT);
assert.equal(first.kind, "accepted");
assert.deepEqual(first.state.player, { x: 3, y: 1 }, "Guard departure does not carry Player");
assert.deepEqual(first.state.guards[0], { x: 4, y: 2 }, "Guard moves sideways from beneath Player");
assert.equal(isPlayerSupported(first.state), false);

for (const action of [Action.LEFT, Action.RIGHT]) {
  const rejected = step(first.state, action);
  assert.equal(rejected.kind, "rejected");
  assert.strictEqual(rejected.state, first.state);
}
const fall = step(first.state, Action.WAIT);
assert.equal(fall.kind, "accepted");
assert.deepEqual(fall.state.player, { x: 3, y: 2 });
assert.equal(fall.state.turn, first.state.turn + 1);

const session = createSession({ ...parsed.stage, tiles: actorRows, gold: [],
  player: { x: 3, y: 1 }, guards: [{ x: 3, y: 2 }] });
const initial = session.state;
const sessionFirst = session.play(Action.WAIT);
assert.deepEqual(sessionFirst, first);
assert.strictEqual(session.undo(), initial, "Undo restores the pre departure state");
assert.deepEqual(session.play(Action.WAIT), first, "replaying after Undo is deterministic");

function replay(initialState) {
  return [Action.WAIT, Action.WAIT].map((action) => {
    const result = step(initialState, action);
    initialState = result.state;
    return result;
  });
}
assert.deepEqual(replay(supportedByGuard), replay(structuredClone(supportedByGuard)));

const unsupportedGuard = createSampleState({
  tiles: ["#########", "#       #", "###   ###", "###   ###", "#########"],
  player: { x: 2, y: 1 },
  guards: [{ x: 4, y: 2 }],
});
const falling = unsupportedGuard;
assert.equal(isPlayerSupported({ ...falling, player: { x: 4, y: 1 } }), true,
  "falling Guard occupancy supports Player without phase metadata");
const trapped = { ...falling, holes: [{ x: 4, y: 2,
  trap: { guardIndex: 0, phase: "trapped", remaining: 2 } }] };
const climbing = { ...trapped, holes: [{ ...trapped.holes[0],
  trap: { guardIndex: 0, phase: "climbing" } }] };
for (const state of [trapped, climbing]) {
  assert.equal(isPlayerSupported({ ...state, player: { x: 4, y: 1 } }), true);
}
const emptyCell = { ...falling, guards: [],
  holes: [{ x: 4, y: 2, remaining: 3 }], player: { x: 4, y: 1 } };
assert.equal(isPlayerSupported(emptyCell), false);
assert.equal(isPlayerSupported({ ...falling, player: { x: 4, y: 1 }, guards: [] }), false);

const collision = step({ ...supportedByGuard,
  guards: [{ x: 3, y: 1 }, { x: 3, y: 2 }] }, Action.WAIT);
assert.equal(collision.state.status, "lost", "Guard occupancy support does not permit overlap");

console.log("Player support from Guard occupancy regression cases passed.");
