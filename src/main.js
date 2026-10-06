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
  statusOutput.value = supported ? "READY" : "FALL — 次の落下を進めてください";
  continueButton.disabled = supported;
}

function showResult(label, result) {
  state = result.state;
  const guard = result.guardPhase ? `; Guard ${result.guardDecision.direction}` : "";
  resultOutput.value = `${label} (${result.kind}${guard})`;
  render();
}

render();
bindInput(document.querySelector(".controls"), (action) => {
  showResult(action, step(state, action));
}, () => {
  if (isSupported(state)) return;
  showResult("continue", step(state, Action.WAIT));
});
