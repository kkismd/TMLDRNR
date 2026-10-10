import assert from "node:assert/strict";
import { Action } from "../src/core/actions.js";
import { createSampleState } from "../src/core/state.js";
import { applyPlayerAction } from "../src/core/player-step.js";
import { isSupported } from "../src/core/terrain.js";
import { GuardCadence, GUARD_TRAP_TURNS, isPlayerSupported, step } from "../src/core/step.js";
import { createSession } from "../src/web/session.js";
import { renderBoard } from "../src/web/render.js";

const stage = {
  tiles: ["#######", "#     #", "##### #", "#######"],
  player: { x: 1, y: 1 },
  guards: [{ x: 3, y: 1 }],
};
const activeHole = {
  ...createSampleState(stage),
  holes: [{ x: 3, y: 2, remaining: 5 }],
};

const entry = step(activeHole, Action.WAIT);
assert.equal(entry.guardResults[0].outcome, "gravity");
assert.equal(entry.guardResults[0].decision, null);
assert.deepEqual(entry.state.guards[0], { x: 3, y: 2 });
assert.deepEqual(entry.state.holes, [{
  x: 3, y: 2,
  trap: { guardIndex: 0, phase: "trapped", remaining: GUARD_TRAP_TURNS },
}]);

let state = entry.state;
for (const remaining of [2, 1]) {
  const result = step(state, Action.WAIT, GuardCadence.EVERY_OTHER);
  assert.equal(result.state.holes[0].trap.remaining, remaining);
  assert.deepEqual(result.state.guards[0], { x: 3, y: 2 });
  assert.equal(result.guardResults[0].outcome, "trapped");
  state = result.state;
}
const climbing = step(state, Action.WAIT, GuardCadence.EVERY_OTHER);
assert.deepEqual(climbing.state.holes[0].trap, { guardIndex: 0, phase: "climbing" });
state = climbing.state;
const escaped = step(state, Action.WAIT);
assert.deepEqual(escaped.state.guards[0], { x: 3, y: 1 });
assert.deepEqual(escaped.state.holes, []);
assert.equal(escaped.guardResults[0].outcome, "escape");

const replayActions = Array(5).fill(Action.WAIT);
function replay(initial) {
  let current = initial;
  return replayActions.map((action) => {
    const result = step(current, action);
    current = result.state;
    return result;
  });
}
assert.deepEqual(replay(activeHole), replay(structuredClone(activeHole)));

const blocked = {
  ...state,
  guards: [{ x: 3, y: 2 }, { x: 3, y: 1 }],
};
const blockedEscape = step(blocked, Action.WAIT);
assert.deepEqual(blockedEscape.state.holes[0].trap, { guardIndex: 0, phase: "climbing" });
assert.deepEqual(blockedEscape.state.guards, blocked.guards);

const blockedByTerrain = {
  ...state,
  tiles: state.tiles.map((row, y) => y === 1
    ? row.map((tile, x) => x === 3 ? "#" : tile)
    : row),
};
const terrainBlockedEscape = step(blockedByTerrain, Action.WAIT);
assert.deepEqual(terrainBlockedEscape.state.holes[0].trap,
  { guardIndex: 0, phase: "climbing" });
assert.deepEqual(terrainBlockedEscape.state.guards, blockedByTerrain.guards);

const collision = {
  ...state,
  player: { x: 2, y: 1 },
};
const escapeCollision = step(collision, Action.RIGHT);
assert.equal(escapeCollision.state.status, "lost");
assert.deepEqual(escapeCollision.defeat, { phase: "guard", guardIndex: 0 });
assert.deepEqual(escapeCollision.state.guards[0], { x: 3, y: 1 });
assert.deepEqual(escapeCollision.state.holes, []);

const session = createSession(stage);
session.state.holes.push({ x: 3, y: 2, remaining: 5 });
const beforeEntry = structuredClone(session.state);
session.play(Action.WAIT);
const afterEntry = structuredClone(session.state);
assert.equal(afterEntry.holes[0].trap.remaining, 3);
session.undo();
assert.deepEqual(session.state, beforeEntry);
session.play(Action.WAIT);
for (let i = 0; i < 4; i += 1) session.play(Action.WAIT);
assert.deepEqual(session.state.holes, []);
session.undo();
assert.deepEqual(session.state.holes[0].trap, { guardIndex: 0, phase: "climbing" });
session.restart();
assert.deepEqual(session.state.holes, []);
assert.equal(session.state.turn, 0);

globalThis.document = {
  createDocumentFragment() { return { children: [], append(child) { this.children.push(child); } }; },
  createElement() { return { className: "", textContent: "", style: { setProperty() {} } }; },
};
const board = {
  style: { setProperty() {} },
  replaceChildren(fragment) { this.children = fragment.children; },
};
renderBoard(board, climbing.state);
assert.ok(board.children.some(({ className, textContent }) =>
  className.includes("tile--guard-climbing") && textContent === "⇧"));
renderBoard(board, entry.state);
assert.ok(board.children.some(({ className }) => className.includes("tile--guard-trapped")));

const noGuardHole = createSampleState({ ...stage, guards: [] });
let ordinary = { ...noGuardHole, holes: [{ x: 3, y: 2, remaining: 6 }] };
for (let remaining = 5; remaining >= 1; remaining -= 1) {
  ordinary = step(ordinary, Action.WAIT).state;
  assert.equal(ordinary.holes[0].remaining, remaining);
}
assert.deepEqual(step(ordinary, Action.WAIT).state.holes, []);

function playerOverTrap(phase = "trapped") {
  return {
    ...createSampleState({ ...stage, guards: [{ x: 3, y: 2 }] }),
    player: { x: 3, y: 1 },
    holes: [{ x: 3, y: 2, trap: { guardIndex: 0, phase,
      ...(phase === "trapped" ? { remaining: 2 } : {}) } }],
  };
}

const trappedSupport = playerOverTrap();
assert.equal(isSupported(trappedSupport), false);
assert.equal(isPlayerSupported(trappedSupport), true);
assert.equal(isPlayerSupported(createSampleState({
  ...stage,
  tiles: ["#######", "#     #", "#######"],
  player: { x: 3, y: 1 },
})), true);
assert.equal(applyPlayerAction(trappedSupport, Action.WAIT).kind, "accepted");
assert.equal(applyPlayerAction(trappedSupport, Action.LEFT).kind, "accepted");
assert.deepEqual(step(trappedSupport, Action.LEFT).state.player, { x: 2, y: 1 });
assert.deepEqual(step(trappedSupport, Action.RIGHT).state.player, { x: 4, y: 1 });
assert.deepEqual(step(trappedSupport, Action.LEFT),
  step(structuredClone(trappedSupport), Action.LEFT));
assert.deepEqual(applyPlayerAction(playerOverTrap("climbing"), Action.WAIT).state.player,
  { x: 3, y: 1 });
assert.equal(isPlayerSupported(playerOverTrap("climbing")), true);

const climbingExit = step(playerOverTrap("climbing"), Action.LEFT);
assert.equal(climbingExit.state.status, "playing");
assert.deepEqual(climbingExit.state.player, { x: 2, y: 1 });
assert.deepEqual(climbingExit.state.guards[0], { x: 3, y: 1 });
assert.deepEqual(climbingExit.state.holes, []);
const climbingCollision = step(playerOverTrap("climbing"), Action.WAIT);
assert.equal(climbingCollision.state.status, "lost");
assert.deepEqual(climbingCollision.defeat, { phase: "guard", guardIndex: 0 });

const emptyHoleSupport = {
  ...createSampleState({ ...stage, guards: [] }),
  player: { x: 3, y: 1 },
  holes: [{ x: 3, y: 2, remaining: 3 }],
};
assert.throws(() => applyPlayerAction(emptyHoleSupport, Action.RIGHT), /supported position/);
assert.equal(isPlayerSupported(emptyHoleSupport), false);
const ordinaryGuardSupport = {
  ...createSampleState({ ...stage, guards: [{ x: 3, y: 2 }] }),
  player: { x: 3, y: 1 },
  holes: [{ x: 3, y: 2, remaining: 3 }],
};
assert.throws(() => applyPlayerAction(ordinaryGuardSupport, Action.WAIT), /supported position/);
assert.equal(isPlayerSupported(ordinaryGuardSupport), false);
const staleTrapSupport = {
  ...playerOverTrap(),
  guards: [{ x: 2, y: 2 }],
};
assert.throws(() => applyPlayerAction(staleTrapSupport, Action.WAIT), /supported position/);
assert.equal(isPlayerSupported(staleTrapSupport), false);
const digOnTrap = {
  ...playerOverTrap(),
  tiles: ["#######", "#     #", "# ### #", "#######"],
};
assert.equal(applyPlayerAction(digOnTrap, Action.DIG_LEFT).kind, "accepted");

const playerAboveTrappedGuard = {
  ...playerOverTrap(),
  guards: [{ x: 3, y: 2 }, { x: 3, y: 1 }],
};
assert.equal(isSupported(playerAboveTrappedGuard, playerAboveTrappedGuard.guards[1]), false);

console.log("Guard trap lifecycle cases passed.");
