import assert from "node:assert/strict";
import { Action } from "../src/core/actions.js";
import { createSampleState } from "../src/core/state.js";
import { step } from "../src/core/step.js";
import { sampleStage } from "../src/stages.js";
import { createSession } from "../src/web/session.js";

const session = createSession(sampleStage);
const initial = session.state;
assert.equal(session.historyLength, 0);
assert.strictEqual(session.undo(), initial);
assert.equal(session.state.turn, 0);
assert.equal(session.historyLength, 0);
assert.equal("history" in session.state, false);

const first = session.play(Action.RIGHT);
assert.equal(first.kind, "accepted");
assert.equal(session.historyLength, 1);
assert.strictEqual(session.undo(), initial);
assert.equal(session.historyLength, 0);
assert.deepEqual(session.play(Action.RIGHT), first);
const afterRight = session.state;
const up = session.play(Action.UP);
assert.equal(up.kind, "accepted");
assert.equal(session.historyLength, 2);
assert.strictEqual(session.undo(), afterRight);
const branch = session.play(Action.WAIT);
assert.deepEqual(branch, step(afterRight, Action.WAIT));
assert.notDeepEqual(branch.state, up.state);
assert.equal(session.historyLength, 2);

session.restart();
assert.equal(session.historyLength, 0);
assert.notStrictEqual(session.state, initial);
assert.deepEqual(session.state, createSampleState(sampleStage));
assert.strictEqual(session.undo(), session.state);

const snapshots = [session.state];
for (const action of [Action.RIGHT, Action.UP, Action.UP]) {
  const result = session.play(action);
  assert.equal(result.kind, "accepted");
  snapshots.push(result.state);
}
assert.equal(session.historyLength, 3);
for (let i = 2; i >= 0; i -= 1) {
  assert.strictEqual(session.undo(), snapshots[i]);
}
assert.equal(session.historyLength, 0);
assert.strictEqual(session.undo(), snapshots[0]);

const rejected = session.play(Action.UP);
assert.equal(rejected.kind, "rejected");
assert.strictEqual(session.state, snapshots[0]);
assert.equal(session.historyLength, 0);

const fallingStage = {
  tiles: ["#######", "#     #", "#     #", "#######"],
  player: { x: 2, y: 1 }, guards: [],
};
const falling = createSession(fallingStage);
const beforeFall = falling.state;
const fall = falling.play(Action.RIGHT);
assert.equal(fall.kind, "forced");
assert.equal(falling.historyLength, 1);
assert.equal(fall.state.turn, 1);
assert.strictEqual(falling.undo(), beforeFall);
assert.equal(falling.state.turn, 0);
assert.deepEqual(falling.play(Action.RIGHT), fall);

const lossStage = {
  tiles: ["#######", "#     #", "#######"],
  player: { x: 2, y: 1 }, guards: [{ x: 3, y: 1 }],
};
const lost = createSession(lossStage);
const beforeLoss = lost.state;
assert.equal(lost.play(Action.RIGHT).state.status, "lost");
assert.equal(lost.historyLength, 1);
assert.equal(lost.play(Action.WAIT).kind, "terminal");
assert.equal(lost.historyLength, 1);
assert.strictEqual(lost.undo(), beforeLoss);
assert.equal(lost.state.status, "playing");
lost.play(Action.RIGHT);
lost.restart();
assert.deepEqual(lost.state, createSampleState(lossStage));
assert.equal(lost.historyLength, 0);

const clearActions = [Action.RIGHT, ...Array(5).fill(Action.UP),
  ...Array(3).fill(Action.RIGHT)];
const won = createSession(sampleStage);
for (const action of clearActions.slice(0, -1)) {
  assert.equal(won.play(action).state.status, "playing");
}
const beforeClear = won.state;
assert.equal(beforeClear.turn, 8);
const clear = won.play(clearActions.at(-1));
assert.equal(clear.kind, "accepted");
assert.equal(clear.state.status, "won");
assert.equal(won.historyLength, 9);
assert.equal(won.play(Action.WAIT).kind, "terminal");
assert.equal(won.historyLength, 9);
assert.strictEqual(won.undo(), beforeClear);
assert.equal(won.state.status, "playing");
assert.deepEqual(won.play(Action.RIGHT), clear);
won.restart();
assert.deepEqual(won.state, createSampleState(sampleStage));
assert.equal(won.state.turn, 0);
assert.equal(won.state.status, "playing");
assert.equal(won.historyLength, 0);

const cadence = createSession(sampleStage);
cadence.play(Action.RIGHT);
const cadencePreState = cadence.state;
const cadenceResult = cadence.play(Action.UP);
assert.strictEqual(cadence.undo(), cadencePreState);
assert.equal(cadence.state.turn, 1);
assert.deepEqual(cadence.play(Action.UP), cadenceResult);

console.log("Session regression cases passed.");
