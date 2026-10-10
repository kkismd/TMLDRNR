import assert from "node:assert/strict";
import { Action } from "../src/core/actions.js";
import { bindInput } from "../src/web/input.js";

const listeners = {};
globalThis.document = {
  addEventListener(type, handler) { listeners[type] = handler; },
};
const actions = [];
const commands = [];
const controls = {
  addEventListener(type, handler) { listeners[`controls-${type}`] = handler; },
  contains() { return true; },
};
bindInput(controls, (action) => actions.push(action), (command) => commands.push(command));
for (const name of ["dig-left", "dig-right"]) {
  listeners["controls-click"]({
    target: { closest: () => ({ dataset: { action: name }, disabled: false }) },
  });
}
assert.deepEqual(actions, [Action.DIG_LEFT, Action.DIG_RIGHT]);

listeners["controls-click"]({
  target: { closest: () => ({ dataset: { action: "continue" }, disabled: false }) },
});
listeners["controls-click"]({
  target: { closest: () => ({ dataset: { command: "undo" }, disabled: false }) },
});
assert.deepEqual(actions, [Action.DIG_LEFT, Action.DIG_RIGHT]);
assert.deepEqual(commands, ["undo"]);

console.log("Dig input binding cases passed.");
