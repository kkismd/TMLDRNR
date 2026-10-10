import { decideGuardMove } from "./guard-ai.js";
import { Action } from "./actions.js";
import { applyPlayerAction, isPlayerSupported } from "./player-step.js";
import { isSupported, isTraversable, tileAt } from "./terrain.js";

export { tileAt, isSupported } from "./terrain.js";
export { isPlayerSupported };

export const GuardCadence = Object.freeze({
  EVERY_TURN: "1:1",
  TWO_OF_THREE: "2:3",
  EVERY_OTHER: "1:2",
  BY_GUARD_COUNT: "1:guard-count",
});

export const HOLE_LIFETIME_TURNS = 6;
export const GUARD_TRAP_TURNS = 3;

function defeat(state, phase, guardIndex) {
  return { state: { ...state, status: "lost" }, defeat: { phase, guardIndex } };
}

function collidedGuardIndex(state) {
  return state.guards.findIndex(({ x, y }) => x === state.player.x && y === state.player.y);
}

function isGuardOccupied(state, x, y, exceptGuardIndex) {
  return state.guards.some((guard, index) =>
    index !== exceptGuardIndex && guard.x === x && guard.y === y);
}

function collectGold(state) {
  const collected = state.gold.some(({ x, y }) => x === state.player.x && y === state.player.y);
  return collected ? { ...state, gold: state.gold.filter(({ x, y }) =>
    x !== state.player.x || y !== state.player.y) } : state;
}

function checkPlayerCell(state, phase) {
  const guardIndex = collidedGuardIndex(state);
  if (guardIndex !== -1) return { ...defeat(state, phase, guardIndex), clear: null };
  const objectiveState = collectGold(state);
  if (tileAt(objectiveState, objectiveState.player.x, objectiveState.player.y) === "E" &&
      objectiveState.gold.length === 0) {
    return { state: { ...objectiveState, status: "won" }, defeat: null, clear: { phase } };
  }
  return { state: objectiveState, defeat: null, clear: null };
}

function trapGuard(state, guardIndex, x, y) {
  const hole = (state.holes ?? []).find(({ x: hx, y: hy, trap }) =>
    !trap && hx === x && hy === y);
  if (!hole) return state;
  return {
    ...state,
    holes: state.holes.map((candidate) => candidate === hole
      ? { x, y, trap: { guardIndex, phase: "trapped", remaining: GUARD_TRAP_TURNS } }
      : candidate),
  };
}

function moveGuardTo(state, guardIndex, destination, phase = "guard") {
  const guards = state.guards.map((guard, index) => index === guardIndex ? destination : guard);
  let current = { ...state, guards };
  if (destination.x === current.player.x && destination.y === current.player.y) {
    return { ...defeat(current, phase, guardIndex), trapped: false };
  }
  const trapped = (current.holes ?? []).some(({ x, y, trap }) =>
    !trap && x === destination.x && y === destination.y);
  if (trapped) current = trapGuard(current, guardIndex, destination.x, destination.y);
  return { state: current, defeat: null, trapped };
}

function advancePlayerGravity(state) {
  const destination = { x: state.player.x, y: state.player.y + 1 };
  if (!isTraversable(state, destination.x, destination.y)) {
    throw new Error("Invalid game state: unsupported player cannot fall into the board below.");
  }
  const checked = checkPlayerCell({ ...state, player: destination }, "player");
  return checked;
}

function advanceGuardGravity(state, guardIndex) {
  const guard = state.guards[guardIndex];
  const destination = { x: guard.x, y: guard.y + 1 };
  if (!isTraversable(state, destination.x, destination.y)) {
    throw new Error("Invalid game state: unsupported guard cannot fall into the board below.");
  }
  if (isGuardOccupied(state, destination.x, destination.y, guardIndex)) {
    return { state, defeat: null, blocked: true };
  }
  return { ...moveGuardTo(state, guardIndex, destination), blocked: false };
}

function advanceHoles(state) {
  let currentState = state;
  const holes = [];
  const escapedGuards = new Set();
  let escapedCollision = null;
  let restoringPlayer = false;

  for (const hole of state.holes ?? []) {
    if (hole.trap) {
      const { guardIndex, phase, remaining } = hole.trap;
      if (phase === "trapped" && remaining > 1) {
        holes.push({ ...hole, trap: { ...hole.trap, remaining: remaining - 1 } });
      } else if (phase === "trapped") {
        holes.push({ ...hole, trap: { guardIndex, phase: "climbing" } });
      } else {
        const destination = { x: hole.x, y: hole.y - 1 };
        const blocked = isGuardOccupied(currentState, destination.x, destination.y, guardIndex);
        if (!blocked && isTraversable(currentState, destination.x, destination.y)) {
          const result = moveGuardTo(currentState, guardIndex, destination);
          currentState = result.state;
          escapedGuards.add(guardIndex);
          if (result.defeat) escapedCollision = result.defeat;
        } else {
          holes.push(hole);
        }
      }
      continue;
    }
    if (hole.remaining <= 1) {
      if (state.player.x === hole.x && state.player.y === hole.y) restoringPlayer = true;
    } else {
      holes.push({ ...hole, remaining: hole.remaining - 1 });
    }
  }

  if ((state.holes ?? []).length > 0) currentState = { ...currentState, holes };
  return { state: currentState, escapedGuards, escapedCollision, restoringPlayer };
}

function guardActsOnTurn(turn, guardCount, cadence) {
  switch (cadence) {
    case GuardCadence.EVERY_TURN: return true;
    case GuardCadence.TWO_OF_THREE: return turn % 3 !== 0;
    case GuardCadence.EVERY_OTHER: return turn % 2 === 1;
    case GuardCadence.BY_GUARD_COUNT: return (turn - 1) % guardCount === 0;
    default: throw new RangeError(`Invalid Guard cadence: ${cadence}`);
  }
}

export function step(state, action, cadence = GuardCadence.EVERY_TURN) {
  if (state.status === "lost" || state.status === "won") {
    return { state, kind: "terminal", guardPhase: false, guardResults: [],
      guardOutcome: null, guardDecision: null, defeat: null, clear: null };
  }
  const playerSupported = isPlayerSupported(state);
  if (!playerSupported && action !== Action.WAIT) {
    return { state, kind: "rejected", guardPhase: false, guardResults: [], guardOutcome: null,
      guardDecision: null, defeat: null, clear: null };
  }

  const playerResult = playerSupported
    ? applyPlayerAction(state, action)
    : { state, kind: "accepted" };
  if (playerResult.kind === "rejected") {
    return { ...playerResult, guardPhase: false, guardResults: [], guardOutcome: null,
      guardDecision: null, defeat: null, clear: null };
  }

  const acceptedState = { ...playerResult.state, turn: state.turn + 1 };
  const acceptedResult = { ...playerResult, state: acceptedState };
  let current = acceptedState;
  let checked = checkPlayerCell(current, "player");
  current = checked.state;
  if (checked.defeat || checked.clear) {
    return { ...acceptedResult, ...checked, guardPhase: false, guardResults: [],
      guardOutcome: null, guardDecision: null };
  }
  if (!playerSupported) {
    checked = advancePlayerGravity(current);
    current = checked.state;
    if (checked.defeat || checked.clear) {
      return { ...acceptedResult, ...checked, guardPhase: false, guardResults: [],
        guardOutcome: null, guardDecision: null };
    }
  }

  const advanced = advanceHoles(current);
  current = advanced.state;
  if (advanced.escapedCollision) {
    return { ...acceptedResult, state: { ...current, status: "lost" },
      defeat: advanced.escapedCollision, clear: null, guardPhase: false,
      guardResults: [], guardOutcome: null, guardDecision: null };
  }
  if (advanced.restoringPlayer) {
    const lost = defeat(current, "hole-restoration", null);
    return { ...acceptedResult, ...lost, clear: null, guardPhase: false,
      guardResults: [], guardOutcome: null, guardDecision: null };
  }

  const guardCount = current.guards.length;
  const movementActive = guardCount > 0 && guardActsOnTurn(current.turn, guardCount, cadence);
  const guardResults = [];
  let defeatMetadata = null;

  for (let guardIndex = 0; guardIndex < guardCount; guardIndex += 1) {
    if (advanced.escapedGuards.has(guardIndex)) {
      guardResults.push({ guardIndex, outcome: "escape", decision: null });
      continue;
    }
    if ((current.holes ?? []).some(({ trap }) => trap?.guardIndex === guardIndex)) {
      guardResults.push({ guardIndex, outcome: "trapped", decision: null });
      continue;
    }

    let guard = current.guards[guardIndex];
    let decision = null;
    if (!isSupported(current, guard)) {
      const advancedGuard = advanceGuardGravity(current, guardIndex);
      current = advancedGuard.state;
      if (advancedGuard.defeat) defeatMetadata = advancedGuard.defeat;
      guardResults.push({ guardIndex, outcome: advancedGuard.blocked ? "blocked" : "gravity",
        decision: null });
      if (defeatMetadata) break;
      continue;
    }
    if (!movementActive) {
      guardResults.push({ guardIndex, outcome: "skip", decision: null });
      continue;
    }

    decision = decideGuardMove(current, guardIndex);
    if (decision.direction === "stay") {
      guardResults.push({ guardIndex, outcome: "stay", decision });
      continue;
    }
    const delta = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[decision.direction];
    const destination = { x: guard.x + delta[0], y: guard.y + delta[1] };
    if (isGuardOccupied(current, destination.x, destination.y, guardIndex)) {
      guardResults.push({ guardIndex, outcome: "blocked", decision });
      continue;
    }
    const moved = moveGuardTo(current, guardIndex, destination);
    current = moved.state;
    if (moved.defeat) {
      defeatMetadata = moved.defeat;
      guardResults.push({ guardIndex, outcome: "move", decision });
      break;
    }
    guardResults.push({ guardIndex, outcome: "move", decision });
    if (defeatMetadata) break;
  }

  if (playerResult.pendingDig && current.status === "playing") {
    current = { ...current, holes: [...(current.holes ?? []),
      { ...playerResult.pendingDig, remaining: HOLE_LIFETIME_TURNS }] };
  }

  const result = { ...acceptedResult, state: current, guardPhase: true, guardResults,
    defeat: defeatMetadata, clear: checked?.clear ?? null };
  if (guardCount === 1) {
    result.guardOutcome = guardResults[0]?.outcome ?? null;
    result.guardDecision = guardResults[0]?.decision ?? null;
  } else {
    result.guardOutcome = null;
    result.guardDecision = null;
  }
  return result;
}
