import { isSupported } from "./core/step.js";
import { Action } from "./core/actions.js";
import { sampleStage } from "./stages.js";
import { bindInput } from "./web/input.js";
import { renderBoard } from "./web/render.js";
import { createSession } from "./web/session.js";

const session = createSession(sampleStage);
const board = document.querySelector("#board");
const turnOutput = document.querySelector("#turn");
const resultOutput = document.querySelector("#last-action");
const statusOutput = document.querySelector("#status");
const continueButton = document.querySelector("[data-action='continue']");
const undoButton = document.querySelector("[data-command='undo']");

function render() {
  const state = session.state;
  renderBoard(board, state);
  turnOutput.value = String(state.turn);
  const supported = isSupported(state);
  statusOutput.value = state.status === "lost" ? "LOST" :
    state.status === "won" ? "CLEAR" :
    supported ? "READY" : "FALL — 次の落下を進めてください";
  continueButton.disabled = state.status === "lost" || state.status === "won" || supported;
  undoButton.disabled = session.historyLength === 0;
}

function showResult(label, result) {
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
  showResult(action, session.play(action));
}, () => {
  if (session.state.status !== "playing" || isSupported(session.state)) return;
  showResult("continue", session.play(Action.WAIT));
}, (command) => {
  if (command === "undo") {
    session.undo();
    resultOutput.value = "UNDO";
  } else if (command === "restart") {
    session.restart();
    resultOutput.value = "RESTART";
  }
  render();
});
