import { Action } from "../core/actions.js";

const keyActions = {
  ArrowLeft: Action.LEFT,
  ArrowRight: Action.RIGHT,
  ArrowUp: Action.UP,
  ArrowDown: Action.DOWN,
  Space: Action.WAIT,
};

const buttonActions = {
  left: Action.LEFT,
  right: Action.RIGHT,
  up: Action.UP,
  down: Action.DOWN,
  wait: Action.WAIT,
  "dig-left": Action.DIG_LEFT,
  "dig-right": Action.DIG_RIGHT,
};

export function bindInput(controls, onAction, onCommand = () => {}) {
  document.addEventListener("keydown", (event) => {
    if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
    const action = keyActions[event.code];
    if (!action) return;

    event.preventDefault();
    onAction(action);
  });

  controls.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action], button[data-command]");
    if (!button || !controls.contains(button) || button.disabled) return;

    if (button.dataset.command) {
      onCommand(button.dataset.command);
      return;
    }

    const action = buttonActions[button.dataset.action];
    if (action) onAction(action);
  });
}
