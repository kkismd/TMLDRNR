import assert from "node:assert/strict";
import { decideGuardMove } from "../src/core/guard-ai.js";
import { isSupported } from "../src/core/terrain.js";

function map(rows) {
  let player;
  let guard;
  const tiles = rows.map((row, y) => [...row].map((tile, x) => {
    if (tile === "P" || tile === "p") player = { x, y };
    if (tile === "G" || tile === "g") guard = { x, y };
    return tile === "p" || tile === "g" ? "H" : tile === "P" || tile === "G" ? " " : tile;
  }));
  assert(player && guard);
  assert(tiles.every((row) => row.length === tiles[0].length));
  return { width: tiles[0].length, height: tiles.length, tiles, player, guards: [guard], turn: 7 };
}

function check(rows, direction, kind, candidate) {
  const state = map(rows);
  const decision = decideGuardMove(state, 0);
  assert.equal(decision.direction, direction);
  assert.equal(decision.kind, kind);
  if (candidate) {
    assert.deepEqual(decision.candidate, candidate);
  }
  return { state, decision };
}

// Same-row chase takes precedence over vertical candidates and works both ways.
check(["#######", "#P G  #", "#######"], "left", "chase");
check(["#######", "#  G P#", "#######"], "right", "chase");
check(["#########", "#P  G   #", "###H#####", "#  H    #", "#########"], "left", "chase");

// A wall and an unsupported gap both prevent direct chase.
check(["#########", "#P #G   #", "#########"], "stay", "stay");
check(["#########", "#P  G   #", "##  #####", "#       #", "#########"],
  "left", "candidate", { x: 3, y: 3, connection: "down", score: [2, 2] });

// Active holes do not change route planning, while actual support remains overlay-aware.
const holeChase = map(["#########", "#  G P  #", "#########"]);
holeChase.holes = [{ x: 4, y: 2, remaining: 4 }];
assert.deepEqual(decideGuardMove(holeChase, 0), { direction: "right", kind: "chase" });
assert.deepEqual(decideGuardMove({ ...holeChase, holes: [] }, 0),
  decideGuardMove(holeChase, 0));

// Ladder-top support keeps the intervening cell within horizontal reach.
check(["#########", "#P G    #", "###H#####", "#  H    #", "#########"], "left", "chase");
check(["# P     #", "# H     #", "# H G   #", "###H#####"],
  "left", "candidate", { x: 2, y: 0, connection: "up", score: [0, 2] });

const unsupported = map(["#######", "#P    #", "#  G  #", "#     #", "#######"]);
assert.throws(() => decideGuardMove(unsupported, 0), /supported position/);

// Current-column connections use their exit row to score, then move one cell.
check(["#######", "#P    #", "#     #", "#  G  #", "#  H  #", "#######"],
  "down", "candidate", { x: 3, y: 4, connection: "down", score: [2, 3] });
check(["#######", "#  P  #", "#  H  #", "#  g  #", "#######"],
  "up", "candidate", { x: 3, y: 1, connection: "up", score: [0, 0] });

// Side ladder connections, including a remote candidate, move horizontally once.
check(["#########", "#P      #", "# H     #", "# H G   #", "#########"],
  "left", "candidate", { x: 2, y: 1, connection: "up", score: [0, 2] });
check(["#########", "#      P#", "#     H #", "#   G H #", "#########"],
  "right", "candidate", { x: 6, y: 1, connection: "up", score: [0, 2] });

// The first unsupported side cell is evaluated as a fall point, but reach stops there.
check(["########", "#P     #", "#  G   #", "#####  #", "#      #", "########"],
  "right", "candidate", { x: 5, y: 4, connection: "down", score: [2, 3] });
check(["#P     #", "#     H#", "#  G  H#", "#####  #", "#      #", "########"],
  "right", "candidate", { x: 5, y: 4, connection: "down", score: [2, 4] });

// Same-row candidate beats an above-row candidate even when farther horizontally.
check(["#########", "#P      #", "# H     #", "# H G H #", "###H#####"],
  "left", "candidate", { x: 2, y: 1, connection: "up", score: [0, 2] });

// Above beats below, even when the below candidate is closer vertically.
check(["#########", "# H     #", "# H    P#", "# H G   #", "#####  ##", "#########"],
  "left", "candidate", { x: 2, y: 1, connection: "up", score: [1, 1] });

// Within the above category, the nearer candidate row wins.
check(["#########", "#       #", "# H     #", "# H     #", "# H G H #", "#########", "#   P   #"],
  "right", "candidate", { x: 6, y: 3, connection: "up", score: [1, 3] });

// At one side position, down is considered before up; the score still decides.
check(["#########", "#       #", "# H     #", "# H G   #", "# H######", "# P     #"],
  "left", "candidate", { x: 2, y: 4, connection: "down", score: [1, 1] });

// Equal scores keep the earlier candidate: current column before a side column.
check(["#########", "#       #", "# H H   #", "# H g   #", "#########", "#   P   #"],
  "up", "candidate", { x: 4, y: 1, connection: "up", score: [1, 4] });

// Left/right ties choose left, and each side is scanned outermost inward.
check(["#########", "#   P   #", "# H   H #", "# H G H #", "#########"],
  "left", "candidate", { x: 2, y: 1, connection: "up", score: [0, 2] });
check(["#########", "#      P#", "# H  H  #", "# H GH  #", "#########"],
  "right", "candidate", { x: 5, y: 1, connection: "up", score: [0, 1] });
check(["###########", "#P        #", "#         #", "# H H     #", "# H H G   #", "###########"],
  "left", "candidate", { x: 2, y: 2, connection: "up", score: [2, 1] });

// No vertical connection means no fallback move.
check(["#######", "#P#G  #", "#######"], "stay", "stay");

const original = map(["#########", "#P      #", "# H     #", "# H G   #", "#########"]);
assert.deepEqual(decideGuardMove(original, 0), decideGuardMove(structuredClone(original), 0));
assert.deepEqual(original.guards, [{ x: 4, y: 3 }]);

// A hole overlay cannot alter ladder / fall candidate planning when actual support is unchanged.
const candidateBaseline = decideGuardMove(original, 0);
for (let y = 0; y < original.height; y += 1) {
  for (let x = 0; x < original.width; x += 1) {
    if (original.tiles[y][x] !== "#") continue;
    const withHole = { ...original, holes: [{ x, y, remaining: 3 }] };
    if (!isSupported(withHole, original.guards[0])) continue;
    assert.deepEqual(decideGuardMove(withHole, 0), candidateBaseline);
  }
}
assert.throws(() => decideGuardMove(original, 1), RangeError);
console.log("Guard AI regression cases passed.");
