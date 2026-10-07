import assert from "node:assert/strict";
import { createSampleState } from "../src/core/state.js";
import { renderBoard } from "../src/web/render.js";

function installDocument() {
  globalThis.document = {
    createDocumentFragment() {
      return {
        children: [],
        append(child) { this.children.push(child); },
      };
    },
    createElement() {
      return { className: "", textContent: "" };
    },
  };
}

installDocument();
const board = { replaceChildren(fragment) { this.children = fragment.children; } };
const stage = {
  tiles: ["#####", "# E #", "#####"],
  player: { x: 1, y: 1 },
  guards: [],
  gold: [{ x: 3, y: 1 }],
};
renderBoard(board, createSampleState(stage));
assert.ok(board.children.some(({ className, textContent }) =>
  className.includes("tile--gold") && textContent === "●"));
assert.ok(board.children.some(({ className }) => className.includes("tile--goal-inactive")));

const guardOnGoldState = createSampleState({
  ...stage,
  guards: [{ x: 3, y: 1 }],
});
renderBoard(board, guardOnGoldState);
const guardOnGold = board.children.find(({ className }) => className.includes("tile--guard"));
assert.ok(guardOnGold.className.includes("tile--has-gold"));
assert.equal(guardOnGold.textContent, "◆");

const activeState = createSampleState({ ...stage, gold: [] });
renderBoard(board, activeState);
assert.ok(board.children.some(({ className }) => className.includes("tile--goal-active")));
assert.ok(!board.children.some(({ className }) => className === "tile tile--gold"));

renderBoard(board, { ...activeState, holes: [{ x: 2, y: 1, remaining: 2 }] });
assert.ok(board.children.some(({ className, textContent }) =>
  className.includes("tile--hole") && textContent === "○"));
renderBoard(board, { ...activeState, holes: [{ x: 2, y: 1, remaining: 1 }] });
assert.ok(board.children.some(({ className, textContent }) =>
  className.includes("tile--hole-warning") && textContent === "◌"));

console.log("Renderer objective display cases passed.");
