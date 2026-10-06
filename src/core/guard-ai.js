import { isSupported, isTraversable, tileAt } from "./terrain.js";

function directChaseDirection(state, guard) {
  const player = state.player;
  if (guard.y !== player.y || guard.x === player.x) return undefined;

  const direction = Math.sign(player.x - guard.x);
  for (let x = guard.x + direction; x !== player.x + direction; x += direction) {
    if (!isTraversable(state, x, guard.y) || !isSupported(state, { x, y: guard.y })) {
      return undefined;
    }
  }
  return direction < 0 ? "left" : "right";
}

function reachLimit(state, guard, direction) {
  let limit = guard.x;
  for (let x = guard.x + direction; isTraversable(state, x, guard.y); x += direction) {
    limit = x;
    if (!isSupported(state, { x, y: guard.y })) break; // Fall point is the boundary.
  }
  return limit;
}

function upRow(state, x, y) {
  if (tileAt(state, x, y) !== "H") return undefined;
  let row = y;
  while (row > 0 && tileAt(state, x, row - 1) === "H") row--;
  if (row > 0 && isTraversable(state, x, row - 1)) row--;
  return row < y ? row : undefined;
}

function downRow(state, x, y) {
  for (let row = y + 1; isTraversable(state, x, row); row++) {
    if (isSupported(state, { x, y: row })) return row;
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
    if (!isTraversable(state, guard.x, guard.y + 1)) {
      throw new Error("Invalid game state: unsupported guard cannot fall into the board below.");
    }
    return { direction: "down", kind: "forced" };
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

export function stepGuard(state, guardIndex) {
  const decision = decideGuardMove(state, guardIndex);
  const guard = state.guards[guardIndex];
  const delta = {
    left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
    up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, stay: { x: 0, y: 0 },
  }[decision.direction];
  const guards = state.guards.map((position, index) => index === guardIndex
    ? { x: guard.x + delta.x, y: guard.y + delta.y }
    : position);
  return { state: { ...state, guards }, decision };
}
