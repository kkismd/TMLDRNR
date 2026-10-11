import { stages } from "./stages.js";
import { formatStageAsMapText, parseMapText } from "./map-text.js";
import { bindInput } from "./web/input.js";
import { getStatusLabel, renderBoard } from "./web/render.js";
import { createSession } from "./web/session.js";

let selectedStage = stages[0];
let session = createSession(selectedStage);
let mode = "normal";
let editorText = "";
const board = document.querySelector("#board");
const stageSelect = document.querySelector("#stage-select");
const turnOutput = document.querySelector("#turn");
const resultOutput = document.querySelector("#last-action");
const statusOutput = document.querySelector("#status");
const undoButton = document.querySelector("[data-command='undo']");
const controls = document.querySelector(".controls");
const editor = document.querySelector("#map-editor");
const mapTextarea = document.querySelector("#map-text");
const editorError = document.querySelector("#editor-error");
const editButton = document.querySelector("#edit-stage");
const playtestButton = document.querySelector("#playtest-map");
const returnButton = document.querySelector("#return-to-editor");
const resetButton = document.querySelector("#reset-map");

for (const stage of stages) {
  const option = document.createElement("option");
  option.value = stage.id;
  option.textContent = stage.title;
  stageSelect.append(option);
}
stageSelect.value = selectedStage.id;

function render() {
  const state = session.state;
  renderBoard(board, state);
  turnOutput.value = String(state.turn);
  statusOutput.value = getStatusLabel(state);
  undoButton.disabled = session.historyLength === 0;
  controls.dataset.mode = mode;
  controls.querySelectorAll("button[data-action], button[data-command]").forEach((button) => {
    button.disabled = mode === "editing" || (button.dataset.command === "undo" && session.historyLength === 0);
  });
  editor.hidden = mode === "normal";
  mapTextarea.readOnly = mode !== "editing";
  playtestButton.hidden = mode !== "editing";
  returnButton.hidden = mode !== "playtest";
  resetButton.hidden = mode === "playtest";
  editButton.disabled = mode !== "normal";
  stageSelect.disabled = mode === "playtest";
  if (mode === "editing") mapTextarea.value = editorText;
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
stageSelect.addEventListener("change", () => {
  selectedStage = stages.find(({ id }) => id === stageSelect.value);
  session = createSession(selectedStage);
  mode = "normal";
  editorText = "";
  editorError.textContent = "";
  resultOutput.value = "STAGE CHANGE";
  render();
});
editButton.addEventListener("click", () => {
  const formatted = formatStageAsMapText(selectedStage);
  if (!formatted.ok) {
    editor.hidden = false;
    mapTextarea.hidden = true;
    resetButton.hidden = true;
    editorError.textContent = `このステージは編集できません: ${formatted.error.message}`;
    return;
  }
  editorText = formatted.text;
  mapTextarea.hidden = false;
  editorError.textContent = "";
  mode = "editing";
  resultOutput.value = "MAP EDITING";
  render();
  mapTextarea.focus();
});
mapTextarea.addEventListener("input", () => {
  if (mode === "editing") editorText = mapTextarea.value;
});
playtestButton.addEventListener("click", () => {
  const parsed = parseMapText(mapTextarea.value);
  editorText = mapTextarea.value;
  if (!parsed.ok) {
    const location = parsed.error.line === null ? "" : `（${parsed.error.line}行${parsed.error.column === null ? "" : `・${parsed.error.column}列`}）`;
    editorError.textContent = `${parsed.error.message}${location}`;
    return;
  }
  session = createSession(parsed.stage);
  mode = "playtest";
  editorError.textContent = "";
  resultOutput.value = "PLAYTEST START";
  render();
});
returnButton.addEventListener("click", () => {
  mode = "editing";
  editorError.textContent = "";
  resultOutput.value = "RETURN TO EDITOR";
  render();
});
resetButton.addEventListener("click", () => {
  const formatted = formatStageAsMapText(selectedStage);
  if (!formatted.ok) return;
  editorText = formatted.text;
  mapTextarea.value = editorText;
  editorError.textContent = "";
});
bindInput(controls, (action) => {
  if (mode !== "playtest" && mode !== "normal") return;
  showResult(action, session.play(action));
}, (command) => {
  if (mode === "editing") return;
  if (command === "undo") {
    session.undo();
    resultOutput.value = "UNDO";
  } else if (command === "restart") {
    session.restart();
    resultOutput.value = "RESTART";
  }
  render();
}, () => mode !== "editing");
