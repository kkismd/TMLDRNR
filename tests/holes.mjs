import assert from "node:assert/strict";
import { Action } from "../src/core/actions.js";
import { createSampleState } from "../src/core/state.js";
import { GuardCadence, HOLE_LIFETIME_TURNS, step } from "../src/core/step.js";
import { baseTileAt, isSupported, isTraversable, tileAt } from "../src/core/terrain.js";
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
assert.deepEqual(digCommit.state.holes, [{ x: 2, y: 2, remaining: HOLE_LIFETIME_TURNS }]);
const nextGuardUpdate = step(digCommit.state, Action.WAIT);
assert.equal(nextGuardUpdate.guardDecision, null);
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

// Bottom-row bricks remain ordinary dig targets, supported by virtual bedrock.
for (const [action, targetX] of [
  [Action.DIG_LEFT, 1],
  [Action.DIG_RIGHT, 3],
]) {
  const bottomRowState = createSampleState({
    tiles: ["#######", "#     #", "#     #", "#######"],
    player: { x: 2, y: 2 },
    guards: [],
  });
  const result = step(bottomRowState, action);
  assert.equal(result.kind, "accepted");
  assert.equal(result.state.turn, bottomRowState.turn + 1);
  assert.deepEqual(result.state.holes, [{ x: targetX, y: 3, remaining: HOLE_LIFETIME_TURNS }]);
  assert.equal(isSupported(result.state, { x: targetX, y: 3 }), true);
  assert.equal(tileAt(result.state, targetX, 4), undefined);
  assert.equal(baseTileAt(result.state, targetX, 4), undefined);
  assert.equal(isTraversable(result.state, targetX, 4), false);
  assert.equal(result.state.tiles[3][targetX], "#");
}

const bottomHolePlayer = createSampleState({
  tiles: ["#######", "#     #", "#     #", "#######"],
  player: { x: 2, y: 2 }, guards: [],
});
const bottomOpenPlayer = createSampleState({
  tiles: ["#######", "#     #", "#     #", "#     #"],
  player: { x: 2, y: 3 }, guards: [],
});
assert.equal(isSupported(bottomOpenPlayer), true);
assert.equal(step(bottomOpenPlayer, Action.DIG_LEFT).kind, "rejected");
const bottomDig = step(bottomHolePlayer, Action.DIG_RIGHT);
const ontoBottomHole = step(bottomDig.state, Action.RIGHT);
assert.equal(isSupported(ontoBottomHole.state), false);
const fallIntoBottomHole = step(ontoBottomHole.state, Action.WAIT);
assert.deepEqual(fallIntoBottomHole.state.player, { x: 3, y: 3 });
assert.equal(isSupported(fallIntoBottomHole.state), true);
assert.equal(tileAt(fallIntoBottomHole.state, 3, 4), undefined);
let bottomLifecycle = fallIntoBottomHole.state;
let restoreResult;
while (bottomLifecycle.holes.length > 0) {
  restoreResult = step(bottomLifecycle, Action.WAIT);
  bottomLifecycle = restoreResult.state;
}
assert.equal(bottomLifecycle.status, "lost");
assert.deepEqual(restoreResult.defeat, { phase: "hole-restoration", guardIndex: null });

const bottomGuardState = createSampleState({
  tiles: ["#######", "#     #", "#     #", "#######"],
  player: { x: 1, y: 2 }, guards: [{ x: 3, y: 2 }],
});
const bottomGuardDig = step(bottomGuardState, Action.DIG_RIGHT);
assert.deepEqual(bottomGuardDig.state.guards[0], { x: 2, y: 2 });
const bottomGuardTrap = step(bottomGuardDig.state, Action.WAIT);
assert.deepEqual(bottomGuardTrap.state.guards[0], { x: 2, y: 3 });
assert.deepEqual(bottomGuardTrap.state.holes[0].trap,
  { guardIndex: 0, phase: "trapped", remaining: 3 });
assert.equal(isSupported(bottomGuardTrap.state, bottomGuardTrap.state.guards[0]), true);
let bottomGuardLifecycle = bottomGuardTrap.state;
while (bottomGuardLifecycle.holes[0]?.trap.phase !== "climbing") {
  bottomGuardLifecycle = step(bottomGuardLifecycle, Action.WAIT).state;
}
const blockedBottomEscape = step({
  ...bottomGuardLifecycle,
  guards: [...bottomGuardLifecycle.guards, { x: 2, y: 2 }],
}, Action.WAIT, GuardCadence.EVERY_OTHER);
assert.deepEqual(blockedBottomEscape.state.holes[0].trap,
  { guardIndex: 0, phase: "climbing" });
assert.deepEqual(blockedBottomEscape.state.guards[0], { x: 2, y: 3 });
const retriedBottomEscape = step({
  ...blockedBottomEscape.state,
  guards: blockedBottomEscape.state.guards.slice(0, 1),
}, Action.WAIT);
assert.deepEqual(retriedBottomEscape.state.guards[0], { x: 2, y: 2 });
assert.deepEqual(retriedBottomEscape.state.holes, []);

const alreadyOpen = { ...rightHole, holes: [{ x: 3, y: 2, remaining: 3 }] };
assert.equal(step(alreadyOpen, Action.DIG_RIGHT).kind, "rejected");
assert.equal(step(alreadyOpen, Action.DIG_RIGHT).state.holes[0].remaining, 3);

const unsupported = createSampleState({
  tiles: ["#######", "#     #", "#     #", "#######"],
  player: { x: 2, y: 1 }, guards: [],
});
assert.equal(step(unsupported, Action.DIG_RIGHT).kind, "rejected");

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
