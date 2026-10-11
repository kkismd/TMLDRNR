import { Action } from "../core/actions.js";
import { createSampleState } from "../core/state.js";
import { GuardCadence, step } from "../core/step.js";

const ACTIONS = [Action.LEFT, Action.RIGHT, Action.UP, Action.DOWN, Action.WAIT,
  Action.DIG_LEFT, Action.DIG_RIGHT];
const TERRAIN = new Set([" ", "#", "X", "H", "-", "E"]);

function assertLimit(value, name, minimum) {
  if (!Number.isInteger(value) || value < minimum) {
    throw new RangeError(`${name} must be an integer greater than or equal to ${minimum}.`);
  }
}

function validateStage(stage) {
  if (!stage || !Array.isArray(stage.tiles) || stage.tiles.length === 0 ||
      !stage.tiles.every((row) => typeof row === "string" && row.length === stage.tiles[0].length) ||
      stage.tiles[0].length === 0) throw new TypeError("Stage tiles must be a non-empty rectangle of strings.");
  const { tiles } = stage;
  const height = tiles.length;
  const width = tiles[0].length;
  if (tiles.some((row) => [...row].some((tile) => !TERRAIN.has(tile)))) {
    throw new TypeError("Stage contains an unsupported terrain symbol.");
  }
  const validPosition = (position) => position && Number.isInteger(position.x) && Number.isInteger(position.y) &&
    position.x >= 0 && position.x < width && position.y >= 0 && position.y < height;
  if (!validPosition(stage.player)) throw new TypeError("Stage player must be an in-bounds integer position.");
  if (!Array.isArray(stage.guards) || stage.guards.some((guard) => !validPosition(guard))) {
    throw new TypeError("Stage guards must be an array of in-bounds integer positions.");
  }
  if (stage.gold !== undefined && (!Array.isArray(stage.gold) || stage.gold.some((gold) => !validPosition(gold)))) {
    throw new TypeError("Stage gold must be an array of in-bounds integer positions.");
  }
  if (tiles.flatMap((row) => [...row]).filter((tile) => tile === "E").length !== 1) {
    throw new TypeError("Stage must contain exactly one Goal.");
  }
}

function cadencePeriod(cadence, guardCount) {
  switch (cadence) {
    case GuardCadence.EVERY_TURN: return 1;
    case GuardCadence.TWO_OF_THREE: return 3;
    case GuardCadence.EVERY_OTHER: return 2;
    case GuardCadence.BY_GUARD_COUNT: return Math.max(1, guardCount);
    default: throw new RangeError(`Invalid Guard cadence: ${cadence}`);
  }
}

// Explicitly project all step-relevant dynamic fields. Keep array order: Guard
// indices and current Core iteration order affect transitions.
function stateKey(state, period) {
  return JSON.stringify({
    player: state.player,
    guards: state.guards,
    gold: state.gold,
    holes: state.holes,
    status: state.status,
    turnPhase: state.turn % period,
  });
}

function restoreActions(nodes, index, finalAction) {
  const actions = [finalAction];
  for (let cursor = nodes[index]; cursor.parent !== null; cursor = nodes[cursor.parent]) {
    actions.push(cursor.action);
  }
  return actions.reverse();
}

function replay(stage, actions, cadence) {
  let state = createSampleState(stage);
  for (const action of actions) {
    const result = step(state, action, cadence);
    if (result.kind !== "accepted") throw new Error("Solver replay rejected an action in its solution.");
    state = result.state;
  }
  if (state.status !== "won") throw new Error("Solver replay did not finish with status won.");
}

/** Find a shortest accepted-action solution using the existing deterministic Core. */
export function solveStage(stage, options = {}) {
  validateStage(stage);
  const { cadence = GuardCadence.EVERY_TURN, maxVisited = 100000, maxDepth = 50 } = options;
  const period = cadencePeriod(cadence, stage.guards.length);
  assertLimit(maxVisited, "maxVisited", 1);
  assertLimit(maxDepth, "maxDepth", 0);

  const initial = createSampleState(stage);
  const nodes = [{ state: initial, parent: null, action: null, depth: 0 }];
  const visited = new Map([[stateKey(initial, period), 0]]);
  let expanded = 0;
  let maxReachedDepth = 0;
  let blockedByMaxDepth = false;
  let blockedByMaxVisited = false;

  for (let head = 0; head < nodes.length; head += 1) {
    const node = nodes[head];
    expanded += 1;
    for (const action of ACTIONS) {
      const result = step(node.state, action, cadence);
      if (result.kind !== "accepted" || result.state.status === "lost") continue;
      const depth = node.depth + 1;
      if (result.state.status === "won") {
        if (depth > maxDepth) { blockedByMaxDepth = true; continue; }
        const actions = restoreActions(nodes, head, action);
        replay(stage, actions, cadence);
        return { status: "solved", actions, steps: actions.length, visited: nodes.length,
          expanded, maxReachedDepth, limit: null };
      }
      const key = stateKey(result.state, period);
      if (visited.has(key)) continue;
      if (depth > maxDepth) { blockedByMaxDepth = true; continue; }
      if (nodes.length >= maxVisited) { blockedByMaxVisited = true; continue; }
      const index = nodes.length;
      visited.set(key, index);
      nodes.push({ state: result.state, parent: head, action, depth });
      maxReachedDepth = Math.max(maxReachedDepth, depth);
    }
  }

  const limit = blockedByMaxDepth ? "maxDepth" : blockedByMaxVisited ? "maxVisited" : null;
  return { status: limit ? "limit-reached" : "unsolvable", actions: null, steps: null,
    visited: nodes.length, expanded, maxReachedDepth, limit };
}
