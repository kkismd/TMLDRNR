export function tileAt(state, x, y) {
  if (x < 0 || y < 0 || x >= state.width || y >= state.height) return undefined;
  return state.tiles[y][x];
}

export function isTraversable(state, x, y) {
  const tile = tileAt(state, x, y);
  return tile !== undefined && tile !== "#";
}

export function isSupported(state, position = state.player) {
  const tile = tileAt(state, position.x, position.y);
  const below = tileAt(state, position.x, position.y + 1);
  return tile === "H" || tile === "-" || below === "#" || below === "H";
}
