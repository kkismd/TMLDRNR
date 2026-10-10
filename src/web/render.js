import { isPlayerSupported } from "../core/step.js";

const tileAppearance = {
  "#": ["wall", "■"],
  "H": ["ladder", "▤"],
  "-": ["rope", "━"],
  "E": ["goal", "▣"],
  " ": ["empty", ""],
};

export function getStatusLabel(state) {
  if (state.status === "lost") return "LOST";
  if (state.status === "won") return "CLEAR";
  return isPlayerSupported(state) ? "READY" : "FALL";
}

export function renderBoard(element, state) {
  element.style.setProperty("--board-columns", state.width);
  element.style.setProperty("--board-aspect-ratio", `${state.width} / ${state.height}`);

  const cells = document.createDocumentFragment();

  for (let y = 0; y < state.height; y += 1) {
    for (let x = 0; x < state.width; x += 1) {
      const cell = document.createElement("span");
      let [kind, symbol] = tileAppearance[state.tiles[y][x]];
      const hole = (state.holes ?? []).find((position) => position.x === x && position.y === y);
      const trap = hole?.trap;
      const holeClass = hole
        ? hole.remaining <= 1 ? " tile--hole tile--hole-warning" : " tile--hole"
        : "";
      if (hole) [kind, symbol] = hole.remaining <= 1
        ? ["hole-warning", "◌"] : ["hole", "○"];
      const goal = state.tiles[y][x] === "E";
      const hasGold = state.gold.some((position) => position.x === x && position.y === y);

      if (state.player.x === x && state.player.y === y) {
        [kind, symbol] = ["player", "●"];
      } else if (state.guards.some((guard) => guard.x === x && guard.y === y)) {
        [kind, symbol] = [trap?.phase === "climbing" ? "guard-climbing" :
          trap ? "guard-trapped" : "guard", trap?.phase === "climbing" ? "⇧" : "◆"];
      } else if (hasGold) {
        [kind, symbol] = ["gold", "●"];
      }

      cell.className = `tile tile--${kind}${trap ? ` tile--trap-${trap.phase}` : ""}${holeClass}${hasGold ? " tile--has-gold" : ""}${goal ?
        (state.gold.length === 0 ? " tile--goal-active" : " tile--goal-inactive") : ""}`;
      cell.textContent = symbol;
      cells.append(cell);
    }
  }

  element.replaceChildren(cells);
}
