import { Action } from "./actions.js";
import { tileAt, isSupported, isTraversable } from "./terrain.js";

const ladderTile = "H";
const ropeTile = "-";
const validActions = new Set(Object.values(Action));

export { tileAt, isSupported } from "./terrain.js";

function movedState(state, x, y) {
  return {
    ...state,
    player: { x, y },
    turn: state.turn + 1,
  };
}

function accepted(state, x = state.player.x, y = state.player.y) {
  return { state: movedState(state, x, y), kind: "accepted" };
}

function rejected(state) {
  return { state, kind: "rejected" };
}

export function step(state, action) {
  const { x, y } = state.player;
  const below = tileAt(state, x, y + 1);

  if (!isSupported(state)) {
    if (!isTraversable(state, x, y + 1)) {
      throw new Error("Invalid game state: unsupported player cannot fall into the board below.");
    }
    return { state: movedState(state, x, y + 1), kind: "forced" };
  }

  if (!validActions.has(action)) return rejected(state);

  switch (action) {
    case Action.LEFT:
    case Action.RIGHT: {
      const nextX = x + (action === Action.LEFT ? -1 : 1);
      return isTraversable(state, nextX, y) ? accepted(state, nextX, y) : rejected(state);
    }
    case Action.UP: {
      const nextY = y - 1;
      if ((tileAt(state, x, y) === ladderTile || tileAt(state, x, nextY) === ladderTile) &&
          isTraversable(state, x, nextY)) {
        return accepted(state, x, nextY);
      }
      return rejected(state);
    }
    case Action.DOWN: {
      const current = tileAt(state, x, y);
      const nextY = y + 1;
      const canDescendRope = current === ropeTile;
      const canDescendLadder = current === ladderTile || below === ladderTile;
      if ((canDescendRope || canDescendLadder) && isTraversable(state, x, nextY)) {
        return accepted(state, x, nextY);
      }
      return rejected(state);
    }
    case Action.WAIT:
      return accepted(state);
    default:
      return rejected(state);
  }
}
