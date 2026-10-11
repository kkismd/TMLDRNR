import assert from "node:assert/strict";
import { Action } from "../src/core/actions.js";
import { bindInput } from "../src/web/input.js";

const listeners = {};
globalThis.document = {
  addEventListener(type, handler) { listeners[type] = handler; },
};
const actions = [];
const commands = [];
let allowed = true;
const controls = {
  addEventListener(type, handler) { listeners[`controls-${type}`] = handler; },
  contains() { return true; },
};
bindInput(controls, (action) => actions.push(action), (command) => commands.push(command), () => allowed);
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

let prevented = 0;
const keydown = listeners.keydown;
keydown({ code: "ArrowLeft", target: { tagName: "TEXTAREA" }, preventDefault() { prevented += 1; } });
keydown({ code: "ArrowLeft", target: { closest: (selector) => selector.includes("textarea") ? {} : null }, preventDefault() { prevented += 1; } });
assert.equal(actions.length, 2, "editable fields keep their arrow keys");
assert.equal(prevented, 0, "editable fields do not prevent browser input");
allowed = false;
keydown({ code: "ArrowRight", target: { tagName: "BODY" }, preventDefault() { prevented += 1; } });
assert.equal(actions.length, 2, "game keyboard input can be disabled while editing");
assert.equal(prevented, 0);

console.log("Dig input binding cases passed.");
