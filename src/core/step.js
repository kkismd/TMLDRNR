import { decideGuardMove, stepGuard } from "./guard-ai.js";
import { stepPlayer } from "./player-step.js";
import { isSupported } from "./terrain.js";

export { tileAt, isSupported } from "./terrain.js";

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
  if (state.status === "lost") {
    return {
      state,
      kind: "terminal",
      guardPhase: false,
      guardResults: [],
      guardOutcome: null,
      guardDecision: null,
      defeat: null,
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
    };
  }

  const guardCount = playerResult.state.guards.length;
  const normalMovementActive = guardCount > 0 && guardActsOnTurn(
    playerResult.state.turn,
    guardCount,
    cadence,
  );
  let currentState = playerResult.state;
  const guardResults = [];
  let defeatMetadata = null;

  for (let guardIndex = 0; guardIndex < guardCount; guardIndex += 1) {
    const guard = currentState.guards[guardIndex];
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

    const guardResult = stepGuard(currentState, guardIndex);
    currentState = guardResult.state;
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
    state: currentState,
    kind: playerResult.kind,
    guardPhase: true,
    guardResults,
    defeat: defeatMetadata,
  };
  if (guardCount === 1) {
    result.guardOutcome = guardResults[0].outcome;
    result.guardDecision = guardResults[0].decision;
  }
  return result;
}
