import assert from "node:assert/strict";
import { Action } from "../src/core/actions.js";
import { createSampleState } from "../src/core/state.js";
import { applyPlayerAction } from "../src/core/player-step.js";
import { isSupported, isTraversable, tileAt } from "../src/core/terrain.js";
import { step } from "../src/core/step.js";

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

const brokenLadder = {
  ...state(["#######", "#  H  #", "#     #", "#  H  #", "#######"], { x: 3, y: 2 }),
  holes: [{ x: 1, y: 2, remaining: 3 }],
};
const rejectedClimb = step(brokenLadder, Action.UP);
assert.equal(rejectedClimb.kind, "rejected", "an upper ladder cannot be climbed from empty space");
assert.strictEqual(rejectedClimb.state, brokenLadder);
assert.equal(rejectedClimb.state.turn, 0);
assert.equal(rejectedClimb.guardPhase, false);
assert.deepEqual(rejectedClimb.state.holes, [{ x: 1, y: 2, remaining: 3 }],
  "a rejected ascent must not advance the hole countdown");

const alternatingRows = Array.from({ length: 9 }, (_, y) => {
  const row = [...(y === 0 || y === 8 ? "#############" : "#           #")];
  if ([1, 3, 5, 7].includes(y)) row[11] = "H";
  return row.join("");
});
const alternatingLadder = state(alternatingRows, { x: 11, y: 2 });
assert.equal(alternatingLadder.width, 13);
assert.equal(alternatingLadder.height, 9);
assert.equal(step(alternatingLadder, Action.UP).kind, "rejected");
const ladderToGap = applyPlayerAction(state(alternatingRows, { x: 11, y: 3 }), Action.DOWN);
assert.equal(ladderToGap.kind, "accepted");
assert.deepEqual(ladderToGap.state.player, { x: 11, y: 4 });

const verticalMoves = [
  { rows: ["#######", "#  H  #", "#  H  #", "#######"], from: 2, action: Action.UP, to: 1 },
  { rows: ["#######", "#     #", "#  H  #", "#######"], from: 2, action: Action.UP, to: 1 },
  { rows: ["#######", "#  H  #", "#     #", "#######"], from: 1, action: Action.DOWN, to: 2 },
  { rows: ["#######", "#  H  #", "#  H  #", "#######"], from: 1, action: Action.DOWN, to: 2 },
  { rows: ["#######", "#     #", "#  H  #", "#######"], from: 1, action: Action.DOWN, to: 2 },
];
for (const { rows, from, action, to } of verticalMoves) {
  const before = state(rows, { x: 3, y: from });
  const moved = applyPlayerAction(before, action);
  assert.equal(moved.kind, "accepted");
  assert.deepEqual(moved.state.player, { x: 3, y: to });
}

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

const bedrock = state(["#######", "#     #", "###X###"], { x: 3, y: 1 });
assert.equal(tileAt(bedrock, 3, 2), "X");
assert.equal(isTraversable(bedrock, 3, 2), false);
assert.equal(isSupported(bedrock), true, "bedrock below the Player provides support");
const blockedByBedrock = state(["#######", "# X   #", "#######"], { x: 1, y: 1 });
assert.equal(applyPlayerAction(blockedByBedrock, Action.RIGHT).kind, "rejected");

const bedrockDig = state(["#########", "#       #", "###X X###"], { x: 4, y: 1 });
for (const action of [Action.DIG_LEFT, Action.DIG_RIGHT]) {
  const rejectedDig = step(bedrockDig, action);
  assert.equal(rejectedDig.kind, "rejected");
  assert.equal(rejectedDig.state, bedrockDig);
  assert.equal(rejectedDig.state.turn, 0);
  assert.deepEqual(rejectedDig.state.holes, []);
  assert.equal(rejectedDig.guardPhase, false);
}
assert.deepEqual(step(dig, Action.DIG_LEFT).state.holes[0],
  { x: 2, y: 2, remaining: 6 }, "brick remains diggable");

assert.deepEqual(applyPlayerAction(game, Action.WAIT),
  applyPlayerAction(structuredClone(game), Action.WAIT));
assert.deepEqual(game.player, { x: 2, y: 2 });
console.log("Player action regression cases passed.");
