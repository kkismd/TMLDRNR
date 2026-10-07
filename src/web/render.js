const tileAppearance = {
  "#": ["wall", "■"],
  "H": ["ladder", "▤"],
  "-": ["rope", "━"],
  "E": ["goal", "▣"],
  " ": ["empty", ""],
};

export function renderBoard(element, state) {
  const cells = document.createDocumentFragment();

  for (let y = 0; y < state.height; y += 1) {
    for (let x = 0; x < state.width; x += 1) {
      const cell = document.createElement("span");
      let [kind, symbol] = tileAppearance[state.tiles[y][x]];
      const goal = state.tiles[y][x] === "E";
      const hasGold = state.gold.some((position) => position.x === x && position.y === y);

      if (state.player.x === x && state.player.y === y) {
        [kind, symbol] = ["player", "●"];
      } else if (state.guards.some((guard) => guard.x === x && guard.y === y)) {
        [kind, symbol] = ["guard", "◆"];
      } else if (hasGold) {
        [kind, symbol] = ["gold", "●"];
      }

      cell.className = `tile tile--${kind}${hasGold ? " tile--has-gold" : ""}${goal ?
        (state.gold.length === 0 ? " tile--goal-active" : " tile--goal-inactive") : ""}`;
      cell.textContent = symbol;
      cells.append(cell);
    }
  }

  element.replaceChildren(cells);
}
