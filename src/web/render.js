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

      if (state.player.x === x && state.player.y === y) {
        [kind, symbol] = ["player", "●"];
      } else if (state.guards.some((guard) => guard.x === x && guard.y === y)) {
        [kind, symbol] = ["guard", "◆"];
      }

      cell.className = `tile tile--${kind}`;
      cell.textContent = symbol;
      cells.append(cell);
    }
  }

  element.replaceChildren(cells);
}
