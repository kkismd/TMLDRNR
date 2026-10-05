import { createSampleState } from "./core/state.js";
import { sampleStage } from "./stages.js";
import { bindInput } from "./web/input.js";
import { renderBoard } from "./web/render.js";

const state = createSampleState(sampleStage);
renderBoard(document.querySelector("#board"), state);

const lastAction = document.querySelector("#last-action");
bindInput(document.querySelector(".controls"), (action) => {
  lastAction.value = action;
});
