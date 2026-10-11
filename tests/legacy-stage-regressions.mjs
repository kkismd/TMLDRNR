import assert from "node:assert/strict";
import { Action } from "../src/core/actions.js";
import { createSampleState } from "../src/core/state.js";
import { step } from "../src/core/step.js";

// These historical boards remain private Core regression fixtures. They are
// intentionally not exported from or included in the player-facing catalog.
const integratedRouteFixture = {
  id: "test-integrated-route",
  tiles: [
    "#############",
    "#   -----H  #",
    "#       #H  #",
    "#       #H  #",
    "#     #E#H  #",
    "#########H###",
    "###      H  #",
    "#############",
    "#############",
  ],
  player: { x: 2, y: 4 },
  guards: [{ x: 11, y: 4 }],
  gold: [{ x: 5, y: 6 }],
  knownSolution: [
    Action.RIGHT, Action.RIGHT, Action.DIG_RIGHT,
    Action.RIGHT, Action.WAIT, Action.WAIT, Action.RIGHT,
    Action.DIG_RIGHT, Action.WAIT,
    Action.RIGHT, Action.RIGHT, Action.RIGHT,
    Action.UP, Action.UP, Action.UP, Action.UP, Action.UP,
    Action.LEFT, Action.LEFT, Action.DOWN, Action.WAIT, Action.WAIT,
  ],
};

const twoAreaRoundTripFixture = {
  id: "test-two-area-round-trip",
  tiles: [
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
  ],
  player: { x: 2, y: 4 },
  guards: [{ x: 12, y: 4 }, { x: 1, y: 8 }],
  gold: [{ x: 11, y: 8 }],
  knownSolution: [
    Action.RIGHT, Action.RIGHT, Action.RIGHT, Action.DIG_RIGHT, Action.RIGHT,
    Action.WAIT, Action.WAIT, Action.WAIT, Action.WAIT,
    Action.RIGHT, Action.RIGHT, Action.RIGHT, Action.RIGHT, Action.RIGHT,
    Action.DIG_LEFT, Action.WAIT, Action.WAIT, Action.WAIT,
    Action.LEFT, Action.LEFT,
    Action.UP, Action.UP, Action.UP, Action.UP, Action.UP, Action.UP, Action.UP,
    Action.LEFT, Action.LEFT, Action.LEFT, Action.LEFT, Action.LEFT,
    Action.DOWN, Action.WAIT, Action.WAIT,
  ],
};

const lureIntoHoleFixture = {
  id: "test-lure-into-hole",
  tiles: [
    "#############", "#############", "#############", "#############",
    "#############", "###      E###", "#############", "#############", "#############",
  ],
  player: { x: 4, y: 5 },
  guards: [{ x: 8, y: 5 }],
  knownSolution: [
    Action.DIG_RIGHT, Action.WAIT, Action.WAIT, Action.WAIT,
    Action.RIGHT, Action.RIGHT, Action.RIGHT, Action.RIGHT, Action.RIGHT,
  ],
};

function replay(stage, actions = stage.knownSolution) {
  let state = createSampleState(stage);
  const results = [];
  for (const action of actions) {
    const result = step(state, action);
    results.push(result);
    assert.equal(result.kind, "accepted", `${stage.id}: ${action} must be accepted`);
    state = result.state;
    if (state.status !== "playing") break;
  }
  return { state, results };
}

const integrated = replay(integratedRouteFixture);
assert.equal(integrated.results.length, 22);
assert.equal(integrated.state.status, "won");
assert.deepEqual(integrated.results[2].state.holes[0], { x: 5, y: 5, remaining: 6 },
  "integrated route: turn 3 Dig creates the descent hole");
assert.deepEqual(integrated.results[5].state.gold, [],
  "integrated route: turn 6 collects Gold");
assert.deepEqual(integrated.results[8].state.holes[0].trap,
  { guardIndex: 0, phase: "trapped", remaining: 3 },
  "integrated route: turn 9 traps the Guard");
assert.deepEqual(integrated.results[9].state.player, { x: 7, y: 6 });
assert.deepEqual(integrated.results[9].state.guards, [{ x: 7, y: 7 }],
  "integrated route: turn 10 trapped Guard supports the Player");
assert.deepEqual(integrated.results[18].state.player, { x: 7, y: 1 },
  "integrated route: turn 19 reaches the upper rope");
assert.deepEqual(integrated.results[19].state.player, { x: 7, y: 2 },
  "integrated route: turn 20 DOWN releases the Player from the rope");
assert.deepEqual(integrated.results[21].state.player, { x: 7, y: 4 });
assert.equal(integrated.state.status, "won", "integrated route: turn 22 reaches Goal");

const withoutSecondTrap = integratedRouteFixture.knownSolution.filter((_, index) => index !== 7 && index !== 8);
const skippedTrap = replay(integratedRouteFixture, withoutSecondTrap);
assert.equal(skippedTrap.state.status, "lost",
  "integrated route: omitting the second Dig/trap loses to Guard collision");
assert.deepEqual(skippedTrap.state.player, { x: 7, y: 6 });
assert.deepEqual(skippedTrap.state.guards, [{ x: 7, y: 6 }]);

const roundTrip = replay(twoAreaRoundTripFixture);
assert.equal(roundTrip.results.length, 35);
assert.equal(roundTrip.state.status, "won");
assert.deepEqual(roundTrip.results[6].state.holes[0].trap,
  { guardIndex: 0, phase: "trapped", remaining: 3 },
  "two-area round trip: turn 7 traps Guard A (index 0)");
assert.deepEqual(roundTrip.results[13].state.player, { x: 11, y: 8 });
assert.deepEqual(roundTrip.results[13].state.guards, [{ x: 5, y: 6 }, { x: 7, y: 8 }]);
assert.deepEqual(roundTrip.results[13].state.gold, [],
  "two-area round trip: turn 14 collects Gold");
assert.deepEqual(roundTrip.results[17].state.guards, [{ x: 5, y: 8 }, { x: 10, y: 9 }]);
assert.deepEqual(roundTrip.results[17].state.holes[0].trap,
  { guardIndex: 1, phase: "trapped", remaining: 3 },
  "two-area round trip: turn 18 traps Guard B (index 1)");
assert.deepEqual(roundTrip.results[19].state.player, { x: 9, y: 8 },
  "two-area round trip: turn 20 positions both Guards for the pincer");
assert.deepEqual(roundTrip.results[20].state.player, { x: 9, y: 7 },
  "two-area round trip: turn 21 escapes via the x9 ladder");
assert.deepEqual(roundTrip.results[31].state.player, { x: 4, y: 1 });
assert.deepEqual(roundTrip.results[32].state.player, { x: 4, y: 2 },
  "two-area round trip: turn 33 DOWN releases the Player from the rope");
assert.deepEqual(roundTrip.results[34].state.player, { x: 4, y: 4 });
assert.equal(roundTrip.state.status, "won", "two-area round trip: turn 35 reaches Goal");

const directReturn = replay(twoAreaRoundTripFixture,
  twoAreaRoundTripFixture.knownSolution.slice(0, 14).concat([Action.LEFT, Action.LEFT]));
assert.equal(directReturn.state.status, "lost",
  "returning after Gold without trapping Guard B loses");
assert.deepEqual(directReturn.state.player, { x: 9, y: 8 });
assert.deepEqual(directReturn.state.guards[1], { x: 9, y: 8 });

const lowerReturn = step(roundTrip.results[19].state, Action.LEFT);
assert.equal(lowerReturn.kind, "accepted");
assert.equal(lowerReturn.state.status, "lost",
  "two-area round trip: ignoring Guard A on the lower return loses");
assert.deepEqual(lowerReturn.state.player, { x: 8, y: 8 });
assert.deepEqual(lowerReturn.state.guards[0], { x: 8, y: 8 });

assert.equal(lureIntoHoleFixture.tiles[5], "###      E###");
assert.equal(lureIntoHoleFixture.guards[0].x - lureIntoHoleFixture.player.x, 4);
const lure = replay(lureIntoHoleFixture, lureIntoHoleFixture.knownSolution.slice(0, 3));
assert.deepEqual(lure.state.guards[0], { x: 5, y: 5 },
  "lure into hole: turn 3 Guard is above the hole");
assert.equal(lure.state.holes[0].trap, undefined,
  "lure into hole: turn 3 Guard has not entered the hole yet");
const fallen = step(lure.state, Action.WAIT);
assert.equal(fallen.kind, "accepted");
assert.deepEqual(fallen.state.guards[0], { x: 5, y: 6 },
  "lure into hole: turn 4 gravity moves Guard into the hole");
assert.deepEqual(fallen.state.holes[0].trap,
  { guardIndex: 0, phase: "trapped", remaining: 3 },
  "lure into hole: turn 4 starts the trap lifecycle");

console.log("Legacy stage Core regression fixtures passed.");
