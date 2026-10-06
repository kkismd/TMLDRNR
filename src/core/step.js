import { stepGuard } from "./guard-ai.js";
import { stepPlayer } from "./player-step.js";
import { isSupported } from "./terrain.js";

export { tileAt, isSupported } from "./terrain.js";

export const GuardCadence = Object.freeze({
  EVERY_TURN: "1:1",
  TWO_OF_THREE: "2:3",
  EVERY_OTHER: "1:2",
});

function guardActsOnTurn(turn, cadence) {
  switch (cadence) {
    case GuardCadence.EVERY_TURN:
      return true;
    case GuardCadence.TWO_OF_THREE:
      return turn % 3 !== 0;
    case GuardCadence.EVERY_OTHER:
      return turn % 2 === 1;
    default:
      throw new RangeError(`Invalid Guard cadence: ${cadence}`);
  }
}

export function step(state, action, cadence = GuardCadence.EVERY_TURN) {
  const playerResult = stepPlayer(state, action);
  if (playerResult.kind === "rejected") {
    return { ...playerResult, guardPhase: false, guardOutcome: null, guardDecision: null };
  }

  const guard = playerResult.state.guards[0];
  if (!guard) throw new RangeError("Invalid guard index: 0");
  if (isSupported(playerResult.state, guard) && !guardActsOnTurn(playerResult.state.turn, cadence)) {
    return {
      ...playerResult,
      guardPhase: true,
      guardOutcome: "skip",
      guardDecision: null,
    };
  }

  const guardResult = stepGuard(playerResult.state, 0);
  return {
    state: guardResult.state,
    kind: playerResult.kind,
    guardPhase: true,
    guardOutcome: guardResult.decision.kind === "forced" ? "forced" :
      guardResult.decision.kind === "stay" ? "stay" : "move",
    guardDecision: guardResult.decision,
  };
}
