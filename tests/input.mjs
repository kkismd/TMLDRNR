import assert from "node:assert/strict";
import { Action } from "../src/core/actions.js";
import { bindInput } from "../src/web/input.js";

const listeners = {};
globalThis.document = {
  addEventListener(type, handler) { listeners[type] = handler; },
};
const actions = [];
const controls = {
  addEventListener(type, handler) { listeners[`controls-${type}`] = handler; },
  contains() { return true; },
};
bindInput(controls, (action) => actions.push(action));
for (const name of ["dig-left", "dig-right"]) {
  listeners["controls-click"]({
    target: { closest: () => ({ dataset: { action: name }, disabled: false }) },
  });
}
assert.deepEqual(actions, [Action.DIG_LEFT, Action.DIG_RIGHT]);

console.log("Dig input binding cases passed.");
