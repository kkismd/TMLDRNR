import assert from "node:assert/strict";
import { Action } from "../src/core/actions.js";
import { createSampleState } from "../src/core/state.js";
import { applyPlayerAction } from "../src/core/player-step.js";
import { isSupported } from "../src/core/terrain.js";

function state(rows, player) {
  return createSampleState({ tiles: rows, player, guards: [] });
}

function position(result) {
  return [result.state.player.x, result.state.player.y, result.state.turn, result.kind];
}

const floor = ["#######", "#     #", "#######"];
let game = state(floor, { x: 2, y: 1 });
assert.deepEqual(position(applyPlayerAction(game, Action.LEFT)), [1, 1, 0, "accepted"]);
assert.deepEqual(position(applyPlayerAction(game, Action.RIGHT)), [3, 1, 0, "accepted"]);
assert.deepEqual(position(applyPlayerAction(game, Action.WAIT)), [2, 1, 0, "accepted"]);
assert.deepEqual(position(applyPlayerAction(game, "invalid")), [2, 1, 0, "rejected"]);
assert.strictEqual(applyPlayerAction(game, "invalid").state, game);

const ladder = ["#######", "#  H  #", "#  H  #", "#     #", "#######"];
game = state(ladder, { x: 3, y: 2 });
assert.deepEqual(position(applyPlayerAction(game, Action.UP)), [3, 1, 0, "accepted"]);
assert.deepEqual(position(applyPlayerAction(game, Action.DOWN)), [3, 3, 0, "accepted"]);

game = state(["#######", "#  H  #", "#     #", "#     #", "#######"], { x: 3, y: 1 });
assert.equal(isSupported(game), true);
const unsupportedExit = applyPlayerAction(game, Action.RIGHT);
assert.deepEqual(position(unsupportedExit), [4, 1, 0, "accepted"]);
assert.equal(isSupported(unsupportedExit.state), false);
assert.throws(() => applyPlayerAction(unsupportedExit.state, Action.LEFT), /supported position/);

game = state(["HHHHH", "HHHHH", "HHHHH", "HHHHH"], { x: 2, y: 2 });
for (const [action, expected] of [
  [Action.LEFT, [1, 2, 0, "accepted"]],
  [Action.RIGHT, [3, 2, 0, "accepted"]],
  [Action.UP, [2, 1, 0, "accepted"]],
  [Action.DOWN, [2, 3, 0, "accepted"]],
]) assert.deepEqual(position(applyPlayerAction(game, action)), expected);

const dig = state(["#######", "#     #", "#######", "#######"], { x: 3, y: 1 });
assert.deepEqual(applyPlayerAction(dig, Action.DIG_LEFT).pendingDig, { x: 2, y: 2 });
assert.equal(applyPlayerAction(dig, Action.DIG_LEFT).state.turn, dig.turn);

assert.deepEqual(applyPlayerAction(game, Action.WAIT),
  applyPlayerAction(structuredClone(game), Action.WAIT));
assert.deepEqual(game.player, { x: 2, y: 2 });
console.log("Player action regression cases passed.");
