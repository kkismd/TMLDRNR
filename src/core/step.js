import { Action } from "./actions.js";

const solidTile = "#";
const ladderTile = "H";
const ropeTile = "-";
const validActions = new Set(Object.values(Action));

export function tileAt(state, x, y) {
  if (x < 0 || y < 0 || x >= state.width || y >= state.height) return undefined;
  return state.tiles[y][x];
}

export function isSupported(state, position = state.player) {
  const tile = tileAt(state, position.x, position.y);
  const below = tileAt(state, position.x, position.y + 1);
  return tile === ladderTile || tile === ropeTile || below === solidTile || below === ladderTile;
}

function traversable(state, x, y) {
  const tile = tileAt(state, x, y);
  return tile !== undefined && tile !== solidTile;
}

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
    if (!traversable(state, x, y + 1)) {
      throw new Error("Invalid game state: unsupported player cannot fall into the board below.");
    }
    return { state: movedState(state, x, y + 1), kind: "forced" };
  }

  if (!validActions.has(action)) return rejected(state);

  switch (action) {
    case Action.LEFT:
    case Action.RIGHT: {
      const nextX = x + (action === Action.LEFT ? -1 : 1);
      return traversable(state, nextX, y) ? accepted(state, nextX, y) : rejected(state);
    }
    case Action.UP: {
      const nextY = y - 1;
      if ((tileAt(state, x, y) === ladderTile || tileAt(state, x, nextY) === ladderTile) &&
          traversable(state, x, nextY)) {
        return accepted(state, x, nextY);
      }
      return rejected(state);
    }
    case Action.DOWN: {
      const current = tileAt(state, x, y);
      const nextY = y + 1;
      const canDescendRope = current === ropeTile;
      const canDescendLadder = current === ladderTile || below === ladderTile;
      if ((canDescendRope || canDescendLadder) && traversable(state, x, nextY)) {
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
