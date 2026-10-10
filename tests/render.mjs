import assert from "node:assert/strict";
import { createSampleState } from "../src/core/state.js";
import { getStatusLabel, renderBoard } from "../src/web/render.js";

function installDocument() {
  globalThis.document = {
    createDocumentFragment() {
      return {
        children: [],
        append(child) { this.children.push(child); },
      };
    },
    createElement() {
      return { className: "", textContent: "", style: { setProperty(name, value) { this[name] = String(value); } } };
    },
  };
}

installDocument();
const board = {
  style: { setProperty(name, value) { this[name] = String(value); } },
  replaceChildren(fragment) { this.children = fragment.children; },
};
const stage = {
  tiles: ["#############", "# E         #", "#############", ...Array.from({ length: 5 }, () => "#           #"), "#############"],
  player: { x: 1, y: 1 },
  guards: [],
  gold: [{ x: 3, y: 1 }],
};
renderBoard(board, createSampleState(stage));
assert.equal(board.style["--board-columns"], "13");
assert.equal(board.style["--board-aspect-ratio"], "13 / 9");
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
assert.equal(getStatusLabel(activeState), "READY");
assert.equal(getStatusLabel({
  ...activeState,
  tiles: [...activeState.tiles.slice(0, 2), "#   #"],
  player: { x: 2, y: 1 },
}), "FALL");
assert.equal(getStatusLabel({ ...activeState, status: "lost" }), "LOST");
assert.equal(getStatusLabel({ ...activeState, status: "won" }), "CLEAR");
renderBoard(board, activeState);
assert.equal(board.style["--board-columns"], "13");
assert.equal(board.style["--board-aspect-ratio"], "13 / 9");
assert.ok(board.children.some(({ className }) => className.includes("tile--goal-active")));
assert.ok(!board.children.some(({ className }) => className === "tile tile--gold"));

renderBoard(board, { ...activeState, holes: [{ x: 2, y: 1, remaining: 2 }] });
assert.ok(board.children.some(({ className, textContent }) =>
  className.includes("tile--hole") && textContent === "○"));
renderBoard(board, { ...activeState, holes: [{ x: 2, y: 1, remaining: 1 }] });
assert.ok(board.children.some(({ className, textContent }) =>
  className.includes("tile--hole-warning") && textContent === "◌"));

renderBoard(board, {
  ...activeState,
  player: { x: 2, y: 1 },
  holes: [{ x: 2, y: 1, remaining: 1 }],
});
const playerOnWarningHole = board.children.find(({ className }) =>
  className.includes("tile--player"));
assert.ok(playerOnWarningHole.className.includes("tile--hole-warning"));
assert.equal(playerOnWarningHole.textContent, "●");

const largeStage = {
  tiles: ["###############", ...Array.from({ length: 9 }, () => "#             #"), "###############"],
  player: { x: 14, y: 1 },
  guards: [{ x: 0, y: 2 }],
  gold: [{ x: 14, y: 2 }],
};
renderBoard(board, createSampleState(largeStage));
assert.equal(board.children.length, 165);
assert.equal(board.style["--board-columns"], "15");
assert.equal(board.style["--board-aspect-ratio"], "15 / 11");
assert.ok(board.children[1 * 15 + 14].className.includes("tile--player"));
assert.ok(board.children[2 * 15].className.includes("tile--guard"));
assert.ok(board.children[2 * 15 + 14].className.includes("tile--gold"));

renderBoard(board, createSampleState(stage));
assert.equal(board.style["--board-columns"], "13");
assert.equal(board.style["--board-aspect-ratio"], "13 / 9");

console.log("Renderer objective display cases passed.");
