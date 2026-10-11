import assert from "node:assert/strict";
import { Action } from "../src/core/actions.js";
import { createSession } from "../src/web/session.js";
import { formatStageAsMapText, parseMapText } from "../src/map-text.js";

const rows = [
  "#############",
  "#P  G       #",
  "# H - E     #",
  "#           #",
  "#   $       #",
  "#       G   #",
  "#           #",
  "#           #",
  "#######X#####",
];
const mapText = rows.join("\n");

const parsed = parseMapText(mapText);
assert.equal(parsed.ok, true);
assert.deepEqual(parsed.stage.player, { x: 1, y: 1 });
assert.deepEqual(parsed.stage.guards, [{ x: 4, y: 1 }, { x: 8, y: 5 }]);
assert.deepEqual(parsed.stage.gold, [{ x: 4, y: 4 }]);
assert.equal(parsed.stage.tiles[1], "#           #");
assert.equal(parsed.stage.tiles[2], "# H - E     #");
assert.equal(parsed.stage.tiles[8], "#######X#####");
assert.equal("knownSolution" in parsed.stage, false);

const crlf = parseMapText(`${mapText.replaceAll("\n", "\r\n")}\r\n`);
assert.deepEqual(crlf, parsed);
assert.equal(parseMapText(`${mapText}\n\n`).ok, false, "only one final newline is accepted");
assert.equal(parseMapText(rows.slice(0, 8).join("\n")).error.code, "invalid-row-count");
assert.equal(parseMapText([...rows.slice(0, 8), "#           "].join("\n")).error.code, "invalid-row-width");
assert.equal(parseMapText([...rows.slice(0, 8), "#          ?#"].join("\n")).error.code, "invalid-symbol");
assert.equal(parseMapText(`\uFEFF${mapText}`).error.code, "invalid-row-width");
assert.equal(parseMapText(mapText.replace("# H - E     #", "# H\t- E     #")).error.code, "invalid-symbol");
assert.equal(parseMapText(mapText.replace("# H - E     #", "# H － E    #")).error.code, "invalid-row-width");

const withNoPlayer = rows.map((row) => row.replace("P", " ")).join("\n");
assert.equal(parseMapText(withNoPlayer).error.code, "player-count");
assert.equal(parseMapText(mapText.replace("P", "G")).error.code, "player-count");
assert.equal(parseMapText(mapText.replace("#           #", "#GGG        #")).error.code, "guard-count");
assert.equal(parseMapText(mapText.replace("E", " ")).error.code, "goal-count");
assert.equal(parseMapText(mapText.replace("E", "E").replace("#           #", "#E          #")).error.code, "goal-count");

const stage = parsed.stage;
stage.knownSolution = [Action.WAIT];
const before = structuredClone(stage);
const formatted = formatStageAsMapText(stage);
assert.equal(formatted.ok, true);
assert.deepEqual(parseMapText(formatted.text).stage, {
  id: "map-editor-stage",
  title: "Map Editor Stage",
  theme: "Created from map text",
  tiles: stage.tiles,
  player: stage.player,
  guards: stage.guards,
  gold: stage.gold,
});
assert.deepEqual(stage, before, "formatting must not mutate the source Stage");
assert.deepEqual(formatStageAsMapText({ ...stage, guards: [...stage.guards].reverse() }).error.code,
  "guard-order-not-representable");
assert.equal(formatStageAsMapText({ ...stage, tiles: [...stage.tiles, "#############"] }).error.code,
  "unsupported-size");

for (const [name, invalidStage, code] of [
  ["actor on ladder", { ...stage, player: { x: 2, y: 2 } }, "actor-terrain-overlap"],
  ["actor on rope", { ...stage, player: { x: 4, y: 2 } }, "actor-terrain-overlap"],
  ["actor on Goal", { ...stage, player: { x: 6, y: 2 } }, "actor-terrain-overlap"],
  ["actor on brick", { ...stage, player: { x: 0, y: 0 } }, "actor-terrain-overlap"],
  ["actor on bedrock", { ...stage, player: { x: 7, y: 8 } }, "actor-terrain-overlap"],
  ["actor overlap", { ...stage, guards: [{ ...stage.player }] }, "overlapping-actors"],
  ["more than two guards", { ...stage, guards: [{ x: 4, y: 1 }, { x: 8, y: 5 }, { x: 2, y: 3 }] }, "invalid-guards"],
  ["no goal", { ...stage, tiles: stage.tiles.map((row) => row.replace("E", " ")) }, "invalid-goal-count"],
  ["two goals", { ...stage, tiles: stage.tiles.map((row, y) => y === 3 ? row.replace(" ", "E") : row) }, "invalid-goal-count"],
  ["gold overlaps actor", { ...stage, gold: [{ ...stage.player }] }, "gold-actor-overlap"],
  ["gold overlaps Goal", { ...stage, gold: [{ x: 6, y: 2 }] }, "gold-goal-overlap"],
  ["duplicate gold", { ...stage, gold: [{ x: 4, y: 4 }, { x: 4, y: 4 }] }, "duplicate-gold"],
  ["gold on terrain", { ...stage, gold: [{ x: 2, y: 2 }] }, "gold-terrain-overlap"],
]) {
  assert.equal(formatStageAsMapText(invalidStage).error.code, code, name);
}

const noGold = { ...stage, gold: [] };
assert.equal(formatStageAsMapText(noGold).ok, true, "zero Gold is valid");
const session = createSession(parsed.stage);
assert.equal(session.state.width, 13);
session.play(Action.WAIT);
session.restart();
assert.equal(session.state.turn, 0);
assert.deepEqual(session.state.gold, parsed.stage.gold);

const bottomDigRows = [
  "#############",
  "#         E #",
  ...Array.from({ length: 5 }, () => "#           #"),
  "# P         #",
  "#############",
];
const bottomBrickText = bottomDigRows.join("\n");
const bottomBrickMap = parseMapText(bottomBrickText);
assert.equal(bottomBrickMap.ok, true);
const bottomBrickSession = createSession(bottomBrickMap.stage);
const bottomDig = bottomBrickSession.play(Action.DIG_RIGHT);
assert.equal(bottomDig.kind, "accepted", "the map editor can playtest a bottom-row brick Dig");
assert.deepEqual(bottomDig.state.holes.map(({ x, y }) => ({ x, y })), [{ x: 3, y: 8 }]);
bottomBrickSession.restart();
assert.equal(bottomBrickSession.state.turn, 0);

const bottomBedrockText = bottomDigRows.slice(0, 8).concat("###X#########").join("\n");
const bottomBedrockMap = parseMapText(bottomBedrockText);
assert.equal(bottomBedrockMap.ok, true);
const bottomBedrockSession = createSession(bottomBedrockMap.stage);
const bottomBedrockDig = bottomBedrockSession.play(Action.DIG_RIGHT);
assert.equal(bottomBedrockDig.kind, "rejected", "the same Dig against X does not advance the turn");
assert.equal(bottomBedrockDig.state.turn, 0);
assert.deepEqual(bottomBedrockDig.state.holes, []);

console.log("Map text conversion cases passed.");
