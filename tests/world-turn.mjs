import assert from "node:assert/strict";
import { Action } from "../src/core/actions.js";
import { decideGuardMove } from "../src/core/guard-ai.js";
import { createSampleState } from "../src/core/state.js";
import { GuardCadence, step } from "../src/core/step.js";

function game(tiles, player, guard) {
  return createSampleState({ tiles, player, guards: [guard] });
}

function check(before, action, kind, player, guard, direction, decisionKind,
  cadence = GuardCadence.EVERY_TURN) {
  const result = step(before, action, cadence);
  assert.equal(result.kind, kind);
  assert.deepEqual(result.state.player, player);
  assert.deepEqual(result.state.guards[0], guard);
  assert.equal(result.state.turn, before.turn + (kind === "rejected" ? 0 : 1));
  assert.equal(result.guardPhase, kind !== "rejected");
  assert.equal(result.guardOutcome, kind === "rejected" ? null :
    decisionKind === "forced" ? "forced" : decisionKind === "stay" ? "stay" : "move");
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

// At the same world turn, only the count-based policy changes with Guard count.
const oneGuardAtTurnOne = { ...onFloor, turn: 1 };
const twoGuardsAtTurnOne = { ...twoGuards, turn: 1 };
const oneGuardCountResult = step(oneGuardAtTurnOne, Action.WAIT, GuardCadence.BY_GUARD_COUNT);
const twoGuardCountResult = step(twoGuardsAtTurnOne, Action.WAIT, GuardCadence.BY_GUARD_COUNT);
assert.equal(oneGuardCountResult.guardOutcome, "move");
assert.deepEqual(oneGuardCountResult.state.guards[0], { x: 4, y: 1 });
assert.equal(twoGuardCountResult.guardOutcome, "skip");
assert.equal(twoGuardCountResult.guardDecision, null);
assert.deepEqual(twoGuardCountResult.state.guards, twoGuardsAtTurnOne.guards);
assert.deepEqual(step(structuredClone(twoGuardsAtTurnOne), Action.WAIT, GuardCadence.BY_GUARD_COUNT),
  twoGuardCountResult);
assert.equal(step(twoGuardsAtTurnOne, Action.WAIT, GuardCadence.EVERY_TURN).guardOutcome, "move");
assert.equal(step(oneGuardAtTurnOne, Action.WAIT, GuardCadence.EVERY_OTHER).guardOutcome, "skip");
assert.equal(step(twoGuardsAtTurnOne, Action.WAIT, GuardCadence.EVERY_OTHER).guardOutcome, "skip");

const up = game(["#########", "#       #", "###H#####", "#  H    #", "#########"],
  { x: 3, y: 2 }, { x: 5, y: 1 });
assert.equal(decideGuardMove(up, 0).kind, "candidate");
check(up, Action.UP, "accepted", { x: 3, y: 1 }, { x: 4, y: 1 }, "left", "chase");
check(up, Action.UP, "accepted", { x: 3, y: 1 }, { x: 4, y: 1 },
  "left", "chase", GuardCadence.EVERY_OTHER);

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
  { x: 4, y: 1 }, "stay", "stay", GuardCadence.EVERY_OTHER);

// Supported Guards skip normal movement on the inactive cadence turns.
const afterOneTurn = { ...onFloor, turn: 1 };
const skipped = step(afterOneTurn, Action.WAIT, GuardCadence.EVERY_OTHER);
assert.equal(skipped.kind, "accepted");
assert.equal(skipped.state.turn, 2);
assert.equal(skipped.guardPhase, true);
assert.equal(skipped.guardOutcome, "skip");
assert.equal(skipped.guardDecision, null);
assert.deepEqual(skipped.state.guards[0], { x: 5, y: 1 });
check(skipped.state, Action.WAIT, "accepted", { x: 2, y: 1 },
  { x: 4, y: 1 }, "left", "chase", GuardCadence.EVERY_OTHER);

const rejectedOnCadence = step({ ...atWall, turn: 1 }, Action.LEFT, GuardCadence.EVERY_OTHER);
assert.equal(rejectedOnCadence.kind, "rejected");
assert.equal(rejectedOnCadence.guardPhase, false);
assert.equal(rejectedOnCadence.guardOutcome, null);
assert.equal(rejectedOnCadence.state.turn, 1);
assert.equal(step(rejectedOnCadence.state, Action.WAIT, GuardCadence.EVERY_OTHER).guardOutcome, "skip");

let twoOfThree = game(floor, { x: 1, y: 1 }, { x: 7, y: 1 });
for (const [outcome, x] of [["move", 6], ["move", 5], ["skip", 5], ["move", 4]]) {
  const result = step(twoOfThree, Action.WAIT, GuardCadence.TWO_OF_THREE);
  assert.equal(result.guardOutcome, outcome);
  assert.deepEqual(result.state.guards[0], { x, y: 1 });
  assert.equal(result.guardDecision === null, outcome === "skip");
  assert.equal(result.state.turn, twoOfThree.turn + 1);
  twoOfThree = result.state;
}

const fallingGuard = game(["#########", "#       #", "###   ###", "#########"],
  { x: 2, y: 1 }, { x: 4, y: 1 });
check(fallingGuard, Action.WAIT, "accepted", { x: 2, y: 1 },
  { x: 4, y: 2 }, "down", "forced");

const longGuardFall = game(["#########", "#       #", "###   ###", "###   ###", "#########"],
  { x: 2, y: 1 }, { x: 4, y: 1 });
const guardFallOne = check({ ...longGuardFall, turn: 1 }, Action.WAIT, "accepted",
  { x: 2, y: 1 }, { x: 4, y: 2 }, "down", "forced", GuardCadence.EVERY_OTHER);
check(guardFallOne.state, Action.WAIT, "accepted", { x: 2, y: 1 },
  { x: 4, y: 3 }, "down", "forced", GuardCadence.EVERY_OTHER);

const twoGuardFall = {
  ...longGuardFall,
  turn: 1,
  guards: [...longGuardFall.guards, { x: 6, y: 1 }],
};
const countFallOne = step(twoGuardFall, Action.WAIT, GuardCadence.BY_GUARD_COUNT);
assert.equal(countFallOne.state.turn, 2); // A supported Guard would skip this turn.
assert.equal(countFallOne.guardOutcome, "forced");
assert.deepEqual(countFallOne.state.guards, [{ x: 4, y: 2 }, { x: 6, y: 1 }]);
assert.deepEqual(step(structuredClone(twoGuardFall), Action.WAIT, GuardCadence.BY_GUARD_COUNT),
  countFallOne);
const countFallTwo = step(countFallOne.state, Action.WAIT, GuardCadence.BY_GUARD_COUNT);
assert.equal(countFallTwo.guardOutcome, "forced");
assert.deepEqual(countFallTwo.state.guards, [{ x: 4, y: 3 }, { x: 6, y: 1 }]);

const fallingPlayer = game(["#########", "#       #", "#       #", "#       #", "#########"],
  { x: 2, y: 1 }, { x: 5, y: 1 });
const fallOne = check(fallingPlayer, Action.LEFT, "forced", { x: 2, y: 2 },
  { x: 5, y: 2 }, "down", "forced");
check(fallOne.state, Action.RIGHT, "forced", { x: 2, y: 3 },
  { x: 5, y: 3 }, "down", "forced");

const actions = [Action.LEFT, Action.RIGHT, Action.WAIT, Action.RIGHT];
function run(initial, cadence = GuardCadence.EVERY_TURN) {
  return actions.map((action) => {
    const result = step(initial, action, cadence);
    initial = result.state;
    return result;
  });
}
assert.deepEqual(run(onFloor), run(structuredClone(onFloor)));
assert.deepEqual(run(onFloor, GuardCadence.EVERY_OTHER),
  run(structuredClone(onFloor), GuardCadence.EVERY_OTHER));
assert.deepEqual(run(onFloor, GuardCadence.TWO_OF_THREE),
  run(structuredClone(onFloor), GuardCadence.TWO_OF_THREE));
assert.deepEqual(onFloor, game(floor, { x: 2, y: 1 }, { x: 5, y: 1 }));

console.log("World turn regression cases passed.");
