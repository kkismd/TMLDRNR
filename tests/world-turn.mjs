import assert from "node:assert/strict";
import { Action } from "../src/core/actions.js";
import { decideGuardMove } from "../src/core/guard-ai.js";
import { createSampleState } from "../src/core/state.js";
import { step } from "../src/core/step.js";

function game(tiles, player, guard) {
  return createSampleState({ tiles, player, guards: [guard] });
}

function check(before, action, kind, player, guard, direction, decisionKind) {
  const result = step(before, action);
  assert.equal(result.kind, kind);
  assert.deepEqual(result.state.player, player);
  assert.deepEqual(result.state.guards[0], guard);
  assert.equal(result.state.turn, before.turn + (kind === "rejected" ? 0 : 1));
  assert.equal(result.guardPhase, kind !== "rejected");
  assert.equal(result.guardDecision?.direction ?? null, direction);
  assert.equal(result.guardDecision?.kind ?? null, decisionKind);
  return result;
}

const floor = ["#########", "#       #", "#########"];
const onFloor = game(floor, { x: 2, y: 1 }, { x: 5, y: 1 });
check(onFloor, Action.LEFT, "accepted", { x: 1, y: 1 }, { x: 4, y: 1 }, "left", "chase");
check(onFloor, Action.RIGHT, "accepted", { x: 3, y: 1 }, { x: 4, y: 1 }, "left", "chase");
check(onFloor, Action.WAIT, "accepted", { x: 2, y: 1 }, { x: 4, y: 1 }, "left", "chase");

const atWall = game(floor, { x: 1, y: 1 }, { x: 5, y: 1 });
const rejected = check(atWall, Action.LEFT, "rejected", { x: 1, y: 1 },
  { x: 5, y: 1 }, null, null);
assert.strictEqual(rejected.state, atWall);
assert.equal(rejected.guardDecision, null);
const twoGuards = { ...onFloor, guards: [...onFloor.guards, { x: 7, y: 1 }] };
assert.deepEqual(step(twoGuards, Action.WAIT).state.guards[1], { x: 7, y: 1 });

const up = game(["#########", "#       #", "###H#####", "#  H    #", "#########"],
  { x: 3, y: 2 }, { x: 5, y: 1 });
assert.equal(decideGuardMove(up, 0).kind, "candidate");
check(up, Action.UP, "accepted", { x: 3, y: 1 }, { x: 4, y: 1 }, "left", "chase");

const down = game(["#########", "#  H    #", "#  H    #", "#########"],
  { x: 3, y: 1 }, { x: 5, y: 2 });
check(down, Action.DOWN, "accepted", { x: 3, y: 2 }, { x: 4, y: 2 }, "left", "chase");

const rope = game(["#########", "#       #", "# ----  #", "#       #", "#       #", "#########"],
  { x: 3, y: 2 }, { x: 5, y: 2 });
check(rope, Action.LEFT, "accepted", { x: 2, y: 2 }, { x: 4, y: 2 }, "left", "chase");
check(rope, Action.DOWN, "accepted", { x: 3, y: 3 }, { x: 5, y: 3 }, "down", "candidate");

const stationary = game(["#######", "# #   #", "#######"],
  { x: 1, y: 1 }, { x: 4, y: 1 });
check(stationary, Action.WAIT, "accepted", { x: 1, y: 1 },
  { x: 4, y: 1 }, "stay", "stay");

const fallingGuard = game(["#########", "#       #", "###   ###", "#########"],
  { x: 2, y: 1 }, { x: 4, y: 1 });
check(fallingGuard, Action.WAIT, "accepted", { x: 2, y: 1 },
  { x: 4, y: 2 }, "down", "forced");

const fallingPlayer = game(["#########", "#       #", "#       #", "#       #", "#########"],
  { x: 2, y: 1 }, { x: 5, y: 1 });
const fallOne = check(fallingPlayer, Action.LEFT, "forced", { x: 2, y: 2 },
  { x: 5, y: 2 }, "down", "forced");
check(fallOne.state, Action.RIGHT, "forced", { x: 2, y: 3 },
  { x: 5, y: 3 }, "down", "forced");

const actions = [Action.LEFT, Action.RIGHT, Action.WAIT, Action.RIGHT];
function run(initial) {
  return actions.map((action) => {
    const result = step(initial, action);
    initial = result.state;
    return result;
  });
}
assert.deepEqual(run(onFloor), run(structuredClone(onFloor)));
assert.deepEqual(onFloor, game(floor, { x: 2, y: 1 }, { x: 5, y: 1 }));

console.log("World turn regression cases passed.");
