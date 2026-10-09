import assert from "node:assert/strict";
import { Action } from "../src/core/actions.js";
import { createSampleState } from "../src/core/state.js";
import { GuardCadence, HOLE_LIFETIME_TURNS, step } from "../src/core/step.js";
import { isSupported, isTraversable, tileAt } from "../src/core/terrain.js";
import { createSession } from "../src/web/session.js";

const tiles = ["#######", "#     #", "#######", "#######"];
const stage = { tiles, player: { x: 2, y: 1 }, guards: [] };
let initial = createSampleState(stage);
assert.deepEqual(initial.holes, []);

for (const [action, x] of [[Action.DIG_LEFT, 1], [Action.DIG_RIGHT, 3]]) {
  const result = step(initial, action);
  assert.equal(result.kind, "accepted");
  assert.equal(result.state.turn, 1);
  assert.equal(result.state.tiles[2][x], "#");
  assert.deepEqual(result.state.holes, [{ x, y: 2, remaining: HOLE_LIFETIME_TURNS }]);
}

const rightHole = step(initial, Action.DIG_RIGHT).state;
assert.equal(tileAt(rightHole, 3, 2), " ");
assert.equal(isTraversable(rightHole, 3, 2), true);
assert.equal(isSupported(rightHole, { x: 3, y: 1 }), false);
assert.equal(rightHole.tiles[2][3], "#");

// Dig completes after this Guard phase; the next update falls through the completed hole.
const digAheadOfGuard = createSampleState({
  tiles: ["#######", "#     #", "#######", "#######"],
  player: { x: 1, y: 1 }, guards: [{ x: 3, y: 1 }],
});
const digCommit = step(digAheadOfGuard, Action.DIG_RIGHT);
assert.equal(digCommit.state.status, "playing");
assert.deepEqual(digCommit.guardDecision, { direction: "left", kind: "chase" });
assert.deepEqual(digCommit.state.guards[0], { x: 2, y: 1 });
assert.deepEqual(digCommit.state.holes,
  [{ x: 2, y: 2, remaining: HOLE_LIFETIME_TURNS }]);
const nextGuardUpdate = step(digCommit.state, Action.WAIT);
assert.deepEqual(nextGuardUpdate.guardDecision, { direction: "down", kind: "forced" });
assert.deepEqual(nextGuardUpdate.state.guards[0], { x: 2, y: 2 });
assert.deepEqual(nextGuardUpdate.state.holes[0].trap,
  { guardIndex: 0, phase: "trapped", remaining: 3 });

const adjacentGuard = createSampleState({
  tiles, player: { x: 2, y: 1 }, guards: [{ x: 3, y: 1 }],
});
const interruptedDig = step(adjacentGuard, Action.DIG_RIGHT);
assert.equal(interruptedDig.state.status, "lost");
assert.deepEqual(interruptedDig.state.holes, []);
assert.equal(interruptedDig.state.tiles[2][3], "#");

const skippedGuardTurn = step({ ...adjacentGuard, turn: 1,
  guards: [{ x: 6, y: 1 }] }, Action.DIG_RIGHT, GuardCadence.EVERY_OTHER);
assert.equal(skippedGuardTurn.state.status, "playing");
assert.deepEqual(skippedGuardTurn.state.holes,
  [{ x: 3, y: 2, remaining: HOLE_LIFETIME_TURNS }]);
assert.equal(skippedGuardTurn.guardResults[0].outcome, "skip");

for (const invalid of [
  { ...initial, player: { x: 5, y: 1 } }, // target and side cell are boundary walls
  createSampleState({ tiles: ["#######", "# ##  #", "#######"],
    player: { x: 1, y: 1 }, guards: [] }), // side cell is blocked
]) {
  const result = step(invalid, Action.DIG_RIGHT);
  assert.equal(result.kind, "rejected");
  assert.equal(result.state.turn, invalid.turn);
}

// Digging a bottom-row brick would create an unsupported hole with no in-board
// fall destination. Reject either direction before the world turn begins.
for (const [action, targetX] of [
  [Action.DIG_LEFT, 1],
  [Action.DIG_RIGHT, 3],
]) {
  const bottomRowState = createSampleState({
    tiles: ["#######", "#     #", "#     #", "#######"],
    player: { x: 2, y: 2 },
    guards: [{ x: 5, y: 2 }],
  });
  const withExistingHole = {
    ...bottomRowState,
    holes: [{ x: 1, y: 2, remaining: 2 }],
  };
  const result = step(withExistingHole, action);
  assert.equal(result.kind, "rejected");
  assert.strictEqual(result.state, withExistingHole);
  assert.equal(result.state.turn, withExistingHole.turn);
  assert.equal(result.guardPhase, false);
  assert.deepEqual(result.guardResults, []);
  assert.deepEqual(result.state.holes, [{ x: 1, y: 2, remaining: 2 }]);
  assert.equal(result.pendingDig, undefined);
  assert.equal(result.state.tiles[3][targetX], "#");
}

const alreadyOpen = { ...rightHole, holes: [{ x: 3, y: 2, remaining: 3 }] };
assert.equal(step(alreadyOpen, Action.DIG_RIGHT).kind, "rejected");
assert.equal(step(alreadyOpen, Action.DIG_RIGHT).state.holes[0].remaining, 3);

const unsupported = createSampleState({
  tiles: ["#######", "#     #", "#     #", "#######"],
  player: { x: 2, y: 1 }, guards: [],
});
const forced = step(unsupported, Action.DIG_RIGHT);
assert.equal(forced.kind, "forced");
assert.deepEqual(forced.state.player, { x: 2, y: 2 });
assert.deepEqual(forced.state.holes, []);

let lifecycle = rightHole;
for (let remaining = 5; remaining >= 1; remaining -= 1) {
  lifecycle = step(lifecycle, Action.WAIT).state;
  assert.equal(lifecycle.holes[0].remaining, remaining);
  assert.equal(lifecycle.tiles[2][3], "#");
}
assert.equal(lifecycle.holes[0].remaining, 1); // Warning turn.
const restored = step(lifecycle, Action.WAIT).state;
assert.deepEqual(restored.holes, []);
assert.equal(tileAt(restored, 3, 2), "#");

const rejectedTimer = step(rightHole, Action.UP);
assert.equal(rejectedTimer.kind, "rejected");
assert.equal(rejectedTimer.state.holes[0].remaining, HOLE_LIFETIME_TURNS);
const terminalTimer = step({ ...rightHole, status: "won" }, Action.WAIT);
assert.equal(terminalTimer.kind, "terminal");
assert.equal(terminalTimer.state.holes[0].remaining, HOLE_LIFETIME_TURNS);

const occupiedAtRestore = {
  ...rightHole,
  player: { x: 3, y: 2 },
  holes: [{ x: 3, y: 2, remaining: 1 }],
};
const restorationLoss = step(occupiedAtRestore, Action.WAIT);
assert.equal(restorationLoss.state.status, "lost");
assert.deepEqual(restorationLoss.defeat, { phase: "hole-restoration", guardIndex: null });
assert.deepEqual(restorationLoss.state.holes, []);

const session = createSession(stage);
const beforeDig = session.state;
session.play(Action.DIG_RIGHT);
assert.equal(session.state.holes[0].remaining, HOLE_LIFETIME_TURNS);
session.undo();
assert.deepEqual(session.state, beforeDig);
session.play(Action.DIG_RIGHT);
for (let i = 0; i < 5; i += 1) session.play(Action.WAIT);
assert.equal(session.state.holes[0].remaining, 1);
const warningState = session.state;
session.play(Action.WAIT);
assert.deepEqual(session.state.holes, []);
session.undo();
assert.strictEqual(session.state, warningState);
session.restart();
assert.deepEqual(session.state.holes, []);
assert.equal(session.state.turn, 0);

const actions = [Action.DIG_RIGHT, Action.WAIT, Action.WAIT, Action.WAIT];
function replay(state) {
  return actions.map((action) => {
    const result = step(state, action);
    state = result.state;
    return result;
  });
}
assert.deepEqual(replay(initial), replay(structuredClone(initial)));

console.log("Hole lifecycle cases passed.");
