import { createSampleState } from "./core/state.js";
import { isSupported, step } from "./core/step.js";
import { Action } from "./core/actions.js";
import { sampleStage } from "./stages.js";
import { bindInput } from "./web/input.js";
import { renderBoard } from "./web/render.js";

let state = createSampleState(sampleStage);
const board = document.querySelector("#board");
const turnOutput = document.querySelector("#turn");
const resultOutput = document.querySelector("#last-action");
const statusOutput = document.querySelector("#status");
const continueButton = document.querySelector("[data-action='continue']");

function render() {
  renderBoard(board, state);
  turnOutput.value = String(state.turn);
  const supported = isSupported(state);
  statusOutput.value = state.status === "lost" ? "LOST" :
    state.status === "won" ? "CLEAR" :
    supported ? "READY" : "FALL — 次の落下を進めてください";
  continueButton.disabled = state.status === "lost" || state.status === "won" || supported;
}

function showResult(label, result) {
  state = result.state;
  const guard = result.guardResults.length
    ? `; ${result.guardResults.map(({ guardIndex, outcome, decision }) =>
      `G${guardIndex} ${outcome}${decision ? ` (${decision.direction})` : ""}`,
    ).join(", ")}`
    : "";
  const defeat = result.defeat
    ? `; LOST (${result.defeat.phase} G${result.defeat.guardIndex})`
    : "";
  const clear = result.clear ? "; CLEAR" : "";
  resultOutput.value = `${label} (${result.kind}${guard}${defeat}${clear})`;
  render();
}

render();
bindInput(document.querySelector(".controls"), (action) => {
  showResult(action, step(state, action));
}, () => {
  if (isSupported(state)) return;
  showResult("continue", step(state, Action.WAIT));
});
