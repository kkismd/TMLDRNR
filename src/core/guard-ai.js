import { baseTileAt, isSupported, isTraversable } from "./terrain.js";

function isBaseTraversable(state, x, y) {
  const tile = baseTileAt(state, x, y);
  return tile !== undefined && tile !== "#";
}

function isBaseSupported(state, position) {
  const tile = baseTileAt(state, position.x, position.y);
  const below = baseTileAt(state, position.x, position.y + 1);
  return tile === "H" || tile === "-" || below === "#" || below === "H";
}

function directChaseDirection(state, guard) {
  const player = state.player;
  if (guard.y !== player.y || guard.x === player.x) return undefined;

  const direction = Math.sign(player.x - guard.x);
  for (let x = guard.x + direction; x !== player.x + direction; x += direction) {
    if (!isBaseTraversable(state, x, guard.y) ||
        !isBaseSupported(state, { x, y: guard.y })) {
      return undefined;
    }
  }
  return direction < 0 ? "left" : "right";
}

function reachLimit(state, guard, direction) {
  let limit = guard.x;
  for (let x = guard.x + direction; isBaseTraversable(state, x, guard.y); x += direction) {
    limit = x;
    if (!isBaseSupported(state, { x, y: guard.y })) break; // Fall point is the boundary.
  }
  return limit;
}

function upRow(state, x, y) {
  if (baseTileAt(state, x, y) !== "H") return undefined;
  let row = y;
  while (row > 0 && baseTileAt(state, x, row - 1) === "H") row--;
  if (row > 0 && isBaseTraversable(state, x, row - 1)) row--;
  return row < y ? row : undefined;
}

function downRow(state, x, y) {
  for (let row = y + 1; isBaseTraversable(state, x, row); row++) {
    if (isBaseSupported(state, { x, y: row })) return row;
  }
  return undefined;
}

function score(row, column, guard, player) {
  if (row === player.y) return [0, Math.abs(column - guard.x)];
  if (row < player.y) return [1, player.y - row];
  return [2, row - player.y];
}

function better(candidate, incumbent) {
  return !incumbent || candidate.score[0] < incumbent.score[0] ||
    (candidate.score[0] === incumbent.score[0] && candidate.score[1] < incumbent.score[1]);
}

export function decideGuardMove(state, guardIndex) {
  const guard = state.guards[guardIndex];
  if (!guard) throw new RangeError(`Invalid guard index: ${guardIndex}`);

  if (!isSupported(state, guard)) {
    throw new Error("Invalid game state: Guard planning requires a supported position.");
  }

  if (guard.x === state.player.x && guard.y === state.player.y) {
    return { direction: "stay", kind: "stay" };
  }

  const chase = directChaseDirection(state, guard);
  if (chase) return { direction: chase, kind: "chase" };

  let best;
  function consider(x, row, connection) {
    if (row === undefined) return;
    const candidate = { x, y: row, connection, score: score(row, x, guard, state.player) };
    if (better(candidate, best)) best = candidate;
  }
  function considerColumn(x) {
    consider(x, downRow(state, x, guard.y), "down");
    consider(x, upRow(state, x, guard.y), "up");
  }

  // The order is part of the rule: current down/up, outermost left inward,
  // then outermost right inward. Equal scores retain the first candidate.
  considerColumn(guard.x);
  const left = reachLimit(state, guard, -1);
  const right = reachLimit(state, guard, 1);
  for (let x = left; x < guard.x; x++) considerColumn(x);
  for (let x = right; x > guard.x; x--) considerColumn(x);

  if (!best) return { direction: "stay", kind: "stay" };
  const direction = best.x < guard.x ? "left" : best.x > guard.x ? "right" : best.connection;
  return { direction, kind: "candidate", candidate: best };
}
