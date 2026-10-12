import assert from "node:assert/strict";
import { test } from "node:test";
import { Action } from "../src/core/actions.js";
import { GuardCadence, step } from "../src/core/step.js";
import { createSampleState } from "../src/core/state.js";
import { solveStage } from "../src/solver/solve-stage.js";
import { blankStage, terraceDescentStage } from "../src/stages.js";
import { runCli } from "../scripts/solve-stage.mjs";

const simpleStage = {
  tiles: ["#####", "#   E", "#####"], player: { x: 1, y: 1 }, guards: [],
};
const holeStage = {
  id: "solver-hole-regression",
  tiles: ["#############", "#############", "#############", "#############",
    "#############", "###      E###", "#############", "#############", "#############"],
  player: { x: 4, y: 5 }, guards: [{ x: 8, y: 5 }],
};
const goldStage = {
  id: "solver-gold-regression",
  tiles: ["#############", "#           #", "#E H  H  H  #", "###H##H##H###",
    "###H##H##H###", "#  H  H  H  #", "#############", "#############", "#############"],
  player: { x: 4, y: 5 }, guards: [{ x: 7, y: 5 }], gold: [{ x: 5, y: 2 }],
  knownSolution: [Action.LEFT, Action.LEFT, Action.RIGHT, Action.UP, Action.UP, Action.UP,
    Action.RIGHT, Action.RIGHT, Action.RIGHT, Action.UP, Action.LEFT, Action.WAIT,
    Action.LEFT, Action.LEFT, Action.LEFT, Action.LEFT],
};

function replay(stage, actions, cadence = GuardCadence.EVERY_TURN, observe = () => {}) {
  let state = { ...stage, gold: stage.gold ?? [], holes: [], turn: 0, status: "playing",
    width: stage.tiles[0].length, height: stage.tiles.length,
    tiles: stage.tiles.map((row) => [...row]), guards: stage.guards.map((guard) => ({ ...guard })) };
  for (const action of actions) {
    const result = step(state, action, cadence);
    assert.equal(result.kind, "accepted");
    state = result.state;
    observe(state);
  }
  return state;
}

test("BFS returns deterministic shortest action sequence and replay wins", () => {
  const first = solveStage(simpleStage);
  const second = solveStage(simpleStage);
  assert.deepEqual(first, second);
  assert.deepEqual(first.actions, [Action.RIGHT, Action.RIGHT, Action.RIGHT]);
  assert.equal(first.steps, 3);
  assert.equal(replay(simpleStage, first.actions).status, "won");
  let frontier = [createSampleState(simpleStage)];
  let independentlyFound = null;
  for (let depth = 1; depth <= 3 && independentlyFound === null; depth += 1) {
    const next = [];
    for (const state of frontier) {
      for (const action of Object.values(Action)) {
        const result = step(state, action);
        if (result.kind !== "accepted" || result.state.status === "lost") continue;
        if (result.state.status === "won") { independentlyFound = depth; break; }
        next.push(result.state);
      }
      if (independentlyFound !== null) break;
    }
    frontier = next;
  }
  assert.equal(first.steps, independentlyFound);
});

test("depth and visited limits report only when they actually cut off states", () => {
  assert.deepEqual(solveStage(simpleStage, { maxDepth: 0 }).status, "limit-reached");
  assert.equal(solveStage(simpleStage, { maxDepth: 0 }).limit, "maxDepth");
  assert.equal(solveStage(simpleStage, { maxVisited: 1 }).limit, "maxVisited");
  const denied = solveStage(simpleStage, { maxVisited: 1 });
  assert.equal(denied.actions, null);
  assert.equal(denied.steps, null);
  const enclosed = { tiles: ["#####", "# #E#", "#####"], player: { x: 1, y: 1 }, guards: [] };
  assert.equal(solveStage(enclosed, { maxDepth: 0 }).status, "unsolvable");
  assert.equal(solveStage(enclosed, { maxVisited: 1 }).status, "unsolvable");
  const branchingStage = { tiles: ["#######", "#   E #", "#######"],
    player: { x: 2, y: 1 }, guards: [] };
  const complete = solveStage(branchingStage);
  assert.equal(complete.status, "solved");
  assert.equal(replay(branchingStage, complete.actions).status, "won");
  const truncated = solveStage(branchingStage, { maxVisited: 4 });
  assert.equal(truncated.status, "limit-reached");
  assert.equal(truncated.limit, "maxVisited");
  assert.equal(truncated.actions, null);
  assert.equal(truncated.steps, null);
});

test("rejected and lost transitions are excluded; invalid input throws", () => {
  const lostStage = { tiles: ["#######", "#   E #", "#######"],
    player: { x: 2, y: 1 }, guards: [{ x: 3, y: 1 }] };
  assert.equal(solveStage(lostStage).status, "unsolvable");
  assert.throws(() => solveStage({ ...simpleStage, tiles: ["##", "#"] }), TypeError);
});

test("turn phase is finite and follows each cadence period", () => {
  const stage = { tiles: ["#######", "# # #E#", "#######"],
    player: { x: 1, y: 1 }, guards: [{ x: 3, y: 1 }] };
  const everyOther = solveStage(stage, { cadence: GuardCadence.EVERY_OTHER });
  const twoOfThree = solveStage(stage, { cadence: GuardCadence.TWO_OF_THREE });
  const byGuard = solveStage(stage, { cadence: GuardCadence.BY_GUARD_COUNT });
  assert.equal(everyOther.status, "unsolvable");
  assert.equal(everyOther.visited, 2);
  assert.equal(twoOfThree.visited, 3);
  assert.equal(byGuard.visited, 1);
  assert.equal(solveStage({ ...stage, guards: [] }, { cadence: GuardCadence.BY_GUARD_COUNT }).visited, 1);
  const twoGuards = { tiles: ["#########", "# # # #E#", "#########"],
    player: { x: 1, y: 1 }, guards: [{ x: 3, y: 1 }, { x: 5, y: 1 }] };
  const byTwoGuards = solveStage(twoGuards, { cadence: GuardCadence.BY_GUARD_COUNT });
  assert.equal(byTwoGuards.status, "unsolvable");
  assert.equal(byTwoGuards.visited, 2);
});

test("multiple existing stages, including hole and Gold rules, solve and replay", () => {
  for (const stage of [blankStage, holeStage, goldStage]) {
    const result = solveStage(stage);
    assert.equal(result.status, "solved", stage.id);
    const history = [];
    assert.equal(replay(stage, result.actions, undefined, (state) => history.push(state)).status, "won", stage.id);
    if (stage === holeStage) {
      assert.ok(history.some(({ holes }) => holes.some(({ remaining }) => remaining === 6)));
      assert.deepEqual(history.flatMap(({ holes }) => holes.map(({ trap }) => trap?.remaining ?? trap?.phase))
        .filter((value) => value !== undefined), [3, 2, 1, "climbing", "climbing"]);
    }
    if (stage === goldStage) assert.ok(result.steps < stage.knownSolution.length);
  }
});

test("CLI file/stdin inputs produce the same JSON solver result", async () => {
  const map = ["#############", "#P   E      #", "#############",
    "#############", "#############", "#############", "#############", "#############", "#############"].join("\n");
  async function invoke(args, overrides = {}) {
    let stdout = "";
    let stderr = "";
    const status = await runCli(args, { writeOut: (text) => { stdout += text; },
      writeErr: (text) => { stderr += text; }, ...overrides });
    return { status, stdout: JSON.parse(stdout), stderr };
  }
  const fromFile = await invoke(["--file", "candidate.txt"], { readFile: async () => map });
  const fromStdin = await invoke(["--stdin"], { readStdin: async () => map });
  assert.equal(fromFile.status, 0);
  assert.equal(fromFile.stdout.source.kind, "file");
  assert.equal(fromFile.stdout.source.value, "candidate.txt");
  assert.equal(fromFile.stdout.stageId, null);
  assert.deepEqual({ ...fromFile.stdout, source: null }, { ...fromStdin.stdout, source: null });
  assert.equal(fromFile.stdout.status, "solved");
});

test("CLI reports parser, catalog, file, and argument errors as JSON", async () => {
  async function invoke(args, overrides = {}) {
    let stdout = "";
    const status = await runCli(args, { writeOut: (text) => { stdout += text; },
      writeErr: () => {}, ...overrides });
    return { status, result: JSON.parse(stdout) };
  }
  const parseFailure = await invoke(["--stdin"], { readStdin: async () => "" });
  assert.equal(parseFailure.status, 1);
  assert.equal(parseFailure.result.parseError.code, "invalid-row-count");
  const missingFile = await invoke(["--file", "missing"], { readFile: async () => { throw new Error("ENOENT"); } });
  assert.equal(missingFile.result.status, "error");
  for (const args of [["--stage", "missing"], ["--stdin", "--stage", "x"], ["--unknown"]]) {
    const result = await invoke(args);
    assert.equal(result.status, 1);
    assert.equal(result.result.status, "error");
  }
  for (const stageId of ["blank", "gold-guard-reposition", terraceDescentStage.id]) {
    const catalog = await invoke(["--stage", stageId, "--max-depth", "0"]);
    assert.equal(catalog.status, 0);
    assert.equal(catalog.result.stageId, stageId);
  }
  const twoLadders = await invoke(["--stage", "two-ladders", "--cadence", "1:1",
    "--max-depth", "60", "--max-visited", "500000"]);
  assert.equal(twoLadders.status, 0);
  assert.equal(twoLadders.result.status, "solved");
  assert.equal(twoLadders.result.steps, 34);
  assert.equal(twoLadders.result.visited, 13020);
  assert.equal(twoLadders.result.expanded, 12257);
  for (const obsoleteId of ["selector-smoke", "gold-out-and-back"]) {
    const obsolete = await invoke(["--stage", obsoleteId]);
    assert.equal(obsolete.status, 1);
    assert.equal(obsolete.result.status, "error");
  }
});
