import { createSampleState } from "../core/state.js";
import { step } from "../core/step.js";

export function createSession(stage) {
  let state = createSampleState(stage);
  let history = [];

  return {
    get state() { return state; },
    get historyLength() { return history.length; },

    play(action) {
      const previous = state;
      const result = step(state, action);
      if (result.kind === "accepted") {
        history.push(previous);
      }
      state = result.state;
      return result;
    },

    undo() {
      if (history.length) state = history.pop();
      return state;
    },

    restart() {
      state = createSampleState(stage);
      history = [];
      return state;
    },
  };
}
