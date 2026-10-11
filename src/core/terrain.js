export function tileAt(state, x, y) {
  if (x < 0 || y < 0 || x >= state.width || y >= state.height) return undefined;
  if ((state.holes ?? []).some((hole) => hole.x === x && hole.y === y)) return " ";
  return state.tiles[y][x];
}

export function baseTileAt(state, x, y) {
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

export function isGuardSupported(state, guardIndex) {
  const guard = state.guards[guardIndex];
  if (!guard) return false;
  if (isSupported(state, guard)) return true;

  return (state.holes ?? []).some((hole) => {
    const trap = hole.trap;
    if (!trap || !["trapped", "climbing"].includes(trap.phase) ||
        trap.guardIndex === guardIndex || hole.x !== guard.x || hole.y !== guard.y + 1) {
      return false;
    }
    const trappedGuard = state.guards[trap.guardIndex];
    return trappedGuard?.x === hole.x && trappedGuard?.y === hole.y;
  });
}
