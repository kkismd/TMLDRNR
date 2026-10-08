import { decideGuardMove, stepGuard } from "./guard-ai.js";
import { isPlayerSupported, stepPlayer } from "./player-step.js";
import { isSupported, isTraversable, tileAt } from "./terrain.js";

export { tileAt, isSupported } from "./terrain.js";
export { isPlayerSupported };

function isGuardOccupied(state, x, y, exceptGuardIndex) {
  return state.guards.some((guard, index) =>
    index !== exceptGuardIndex && guard.x === x && guard.y === y);
}

function collidedGuardIndex(state) {
  return state.guards.findIndex((guard) =>
    guard.x === state.player.x && guard.y === state.player.y);
}

function defeat(state, phase, guardIndex) {
  return {
    state: { ...state, status: "lost" },
    defeat: { phase, guardIndex },
  };
}

export const GuardCadence = Object.freeze({
  EVERY_TURN: "1:1",
  TWO_OF_THREE: "2:3",
  EVERY_OTHER: "1:2",
  BY_GUARD_COUNT: "1:guard-count",
});

export const HOLE_LIFETIME_TURNS = 6;
export const GUARD_TRAP_TURNS = 3;

function advanceHoles(state) {
  const current = state.holes ?? [];
  const holes = [];
  let restoringPlayer = false;
  const escapedGuards = new Set();
  let currentState = state;
  let escapedCollision = null;
  for (const hole of current) {
    if (hole.trap) {
      const { guardIndex, phase, remaining } = hole.trap;
      if (phase === "trapped" && remaining > 1) {
        holes.push({ ...hole, trap: { ...hole.trap, remaining: remaining - 1 } });
      } else if (phase === "trapped") {
        holes.push({ ...hole, trap: { guardIndex, phase: "climbing" } });
      } else {
        const destination = { x: hole.x, y: hole.y - 1 };
        const blockedByGuard = currentState.guards.some((guard, index) =>
          index !== guardIndex && guard.x === destination.x && guard.y === destination.y);
        if (!blockedByGuard && isTraversable(currentState, destination.x, destination.y)) {
          const guards = currentState.guards.map((guard, index) => index === guardIndex
            ? destination : guard);
          currentState = { ...currentState, guards };
          escapedGuards.add(guardIndex);
          if (currentState.player.x === destination.x && currentState.player.y === destination.y) {
            currentState = { ...currentState, status: "lost" };
            escapedCollision = { phase: "guard", guardIndex };
          }
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
  return {
    state: current.length === 0 ? state : { ...currentState, holes },
    restoringPlayer,
    escapedGuards,
    escapedCollision,
  };
}

function guardActsOnTurn(turn, guardCount, cadence) {
  switch (cadence) {
    case GuardCadence.EVERY_TURN:
      return true;
    case GuardCadence.TWO_OF_THREE:
      return turn % 3 !== 0;
    case GuardCadence.EVERY_OTHER:
      return turn % 2 === 1;
    case GuardCadence.BY_GUARD_COUNT:
      return (turn - 1) % guardCount === 0;
    default:
      throw new RangeError(`Invalid Guard cadence: ${cadence}`);
  }
}

export function step(state, action, cadence = GuardCadence.EVERY_TURN) {
  if (state.status === "lost" || state.status === "won") {
    return {
      state,
      kind: "terminal",
      guardPhase: false,
      guardResults: [],
      guardOutcome: null,
      guardDecision: null,
      defeat: null,
      clear: null,
    };
  }

  const playerResult = stepPlayer(state, action);
  if (playerResult.kind === "rejected") {
    return {
      ...playerResult,
      guardPhase: false,
      guardResults: [],
      guardOutcome: null,
      guardDecision: null,
      defeat: null,
      clear: null,
    };
  }

  const playerCollision = collidedGuardIndex(playerResult.state);
  if (playerCollision !== -1) {
    return {
      ...playerResult,
      ...defeat(playerResult.state, "player", playerCollision),
      guardPhase: false,
      guardResults: [],
      guardOutcome: null,
      guardDecision: null,
      clear: null,
    };
  }

  const playerState = playerResult.state;
  const objectiveState = playerState.gold.some(({ x, y }) =>
    x === playerState.player.x && y === playerState.player.y)
    ? { ...playerState, gold: playerState.gold.filter(({ x, y }) =>
      x !== playerState.player.x || y !== playerState.player.y) }
    : playerState;

  if (tileAt(objectiveState, objectiveState.player.x,
    objectiveState.player.y) === "E" && objectiveState.gold.length === 0) {
    return {
      ...playerResult,
      state: { ...objectiveState, status: "won" },
      guardPhase: false,
      guardResults: [],
      guardOutcome: null,
      guardDecision: null,
      defeat: null,
      clear: { phase: "player" },
    };
  }

  const advancedHoles = advanceHoles(objectiveState);
  if (advancedHoles.state.status === "lost") {
    return {
      ...playerResult,
      state: advancedHoles.state,
      defeat: advancedHoles.escapedCollision,
      guardPhase: false,
      guardResults: [],
      guardOutcome: null,
      guardDecision: null,
      clear: null,
    };
  }
  if (advancedHoles.restoringPlayer) {
    return {
      ...playerResult,
      ...defeat(advancedHoles.state, "hole-restoration", null),
      guardPhase: false,
      guardResults: [],
      guardOutcome: null,
      guardDecision: null,
      clear: null,
    };
  }

  const guardCount = advancedHoles.state.guards.length;
  const normalMovementActive = guardCount > 0 && guardActsOnTurn(
    advancedHoles.state.turn,
    guardCount,
    cadence,
  );
  let currentState = advancedHoles.state;
  const guardResults = [];
  let defeatMetadata = null;

  for (let guardIndex = 0; guardIndex < guardCount; guardIndex += 1) {
    const guard = currentState.guards[guardIndex];
    if (advancedHoles.escapedGuards.has(guardIndex)) {
      guardResults.push({ guardIndex, outcome: "escape", decision: null });
      continue;
    }
    if ((currentState.holes ?? []).some((hole) => hole.trap?.guardIndex === guardIndex)) {
      guardResults.push({ guardIndex, outcome: "trapped", decision: null });
      continue;
    }
    const supported = isSupported(currentState, guard);
    if (supported && !normalMovementActive) {
      guardResults.push({ guardIndex, outcome: "skip", decision: null });
      continue;
    }

    const decision = decideGuardMove(currentState, guardIndex);
    if (decision.direction === "stay") {
      guardResults.push({ guardIndex, outcome: "stay", decision });
      continue;
    }

    const delta = {
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 },
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
    }[decision.direction];
    const target = { x: guard.x + delta.x, y: guard.y + delta.y };
    if (isGuardOccupied(currentState, target.x, target.y, guardIndex)) {
      guardResults.push({ guardIndex, outcome: "blocked", decision });
      continue;
    }

    const fallingIntoHole = decision.kind === "forced" && decision.direction === "down" &&
      (currentState.holes ?? []).some((hole) =>
        !hole.trap && hole.x === target.x && hole.y === target.y);
    const guardResult = stepGuard(currentState, guardIndex);
    currentState = guardResult.state;
    if (fallingIntoHole) {
      currentState = {
        ...currentState,
        holes: currentState.holes.map((hole) => hole.x === target.x && hole.y === target.y
          ? { x: hole.x, y: hole.y, trap: { guardIndex, phase: "trapped", remaining: GUARD_TRAP_TURNS } }
          : hole),
      };
    }
    guardResults.push({
      guardIndex,
      outcome: decision.kind === "forced" ? "forced" : "move",
      decision: guardResult.decision,
    });
    if (currentState.guards[guardIndex].x === currentState.player.x &&
        currentState.guards[guardIndex].y === currentState.player.y) {
      const lost = defeat(currentState, "guard", guardIndex);
      currentState = lost.state;
      defeatMetadata = lost.defeat;
      break;
    }
  }

  const result = {
    state: playerResult.pendingDig && currentState.status === "playing"
      ? { ...currentState, holes: [...(currentState.holes ?? []),
        { ...playerResult.pendingDig, remaining: HOLE_LIFETIME_TURNS }] }
      : currentState,
    kind: playerResult.kind,
    guardPhase: true,
    guardResults,
    defeat: defeatMetadata,
    clear: null,
  };
  if (guardCount === 1) {
    result.guardOutcome = guardResults[0].outcome;
    result.guardDecision = guardResults[0].decision;
  }
  return result;
}
