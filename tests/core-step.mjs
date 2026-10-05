import assert from "node:assert/strict";
import { Action } from "../src/core/actions.js";
import { createSampleState } from "../src/core/state.js";
import { isSupported, step } from "../src/core/step.js";

function state(rows, player) {
  return createSampleState({ tiles: rows, player, guards: [{ x: 1, y: 1 }] });
}

function position(result) {
  return [result.state.player.x, result.state.player.y, result.state.turn, result.kind];
}

const floor = ["#######", "#     #", "#######"];
let game = state(floor, { x: 2, y: 1 });
assert.deepEqual(position(step(game, Action.LEFT)), [1, 1, 1, "accepted"]);
assert.deepEqual(position(step(game, Action.RIGHT)), [3, 1, 1, "accepted"]);
const wallResult = step(game, Action.LEFT);
assert.deepEqual(position(step(wallResult.state, Action.LEFT)), [1, 1, 1, "rejected"]);
assert.equal(wallResult.state.turn, 1);
assert.deepEqual(position(step(game, Action.WAIT)), [2, 1, 1, "accepted"]);

const ladder = ["#######", "#  H  #", "#  H  #", "#     #", "#######"];
game = state(ladder, { x: 3, y: 2 });
assert.deepEqual(position(step(game, Action.UP)), [3, 1, 1, "accepted"]);
assert.deepEqual(position(step(game, Action.DOWN)), [3, 3, 1, "accepted"]);
game = state(["#######", "#  H  #", "#     #", "#     #", "#######"], { x: 3, y: 1 });
const sideExit = step(game, Action.RIGHT);
assert.deepEqual(position(sideExit), [4, 1, 1, "accepted"]);
assert.equal(isSupported(sideExit.state), false);
assert.deepEqual(position(step(sideExit.state, Action.LEFT)), [4, 2, 2, "forced"]);

const rope = ["#######", "#     #", "# --- #", "#     #", "#     #", "#######"];
game = state(rope, { x: 3, y: 2 });
assert.deepEqual(position(step(game, Action.LEFT)), [2, 2, 1, "accepted"]);
const ropeDetach = step(game, Action.DOWN);
assert.deepEqual(position(ropeDetach), [3, 3, 1, "accepted"]);
assert.equal(isSupported(ropeDetach.state), false);
assert.deepEqual(position(step(ropeDetach.state, Action.RIGHT)), [3, 4, 2, "forced"]);

game = state(["#######", "#     #", "#     #", "#     #", "#######"], { x: 2, y: 1 });
assert.equal(isSupported(game), false);
assert.deepEqual(position(step(game, Action.RIGHT)), [2, 2, 1, "forced"]);
const fallTwo = step(step(game, Action.WAIT).state, Action.WAIT);
assert.deepEqual(position(fallTwo), [2, 3, 2, "forced"]);
assert.deepEqual(position(step(fallTwo.state, Action.WAIT)), [2, 3, 3, "accepted"]);

const first = step(game, Action.LEFT);
const second = step(structuredClone(game), Action.LEFT);
assert.deepEqual(first, second);
assert.deepEqual(game.player, { x: 2, y: 1 });
console.log("Core movement regression cases passed.");
