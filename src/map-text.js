const WIDTH = 13;
const HEIGHT = 9;
const TERRAIN = new Set([" ", "#", "X", "H", "-", "E"]);
const MAP_SYMBOLS = new Set([...TERRAIN, "P", "G", "$"]);

function failure(code, message, line = null, column = null) {
  return { ok: false, error: { code, message, line, column } };
}

function coordinateKey({ x, y }) {
  return `${x},${y}`;
}

function validPosition(position) {
  return position && Number.isInteger(position.x) && Number.isInteger(position.y)
    && position.x >= 0 && position.x < WIDTH && position.y >= 0 && position.y < HEIGHT;
}

function validateStage(stage) {
  if (!stage || !Array.isArray(stage.tiles) || stage.tiles.length !== HEIGHT
      || stage.tiles.some((row) => typeof row !== "string" || row.length !== WIDTH)) {
    return failure("unsupported-size", "Stage must be exactly 13 columns by 9 rows.");
  }
  if (stage.tiles.some((row) => [...row].some((tile) => !TERRAIN.has(tile)))) {
    return failure("invalid-terrain", "Stage contains an unsupported terrain symbol.");
  }
  if (!validPosition(stage.player)) {
    return failure("invalid-player", "Player must have an in-bounds integer position.");
  }
  if (!Array.isArray(stage.guards) || stage.guards.length > 2
      || stage.guards.some((guard) => !validPosition(guard))) {
    return failure("invalid-guards", "Stage must have 0 to 2 Guards with in-bounds integer positions.");
  }
  if (stage.gold !== undefined && !Array.isArray(stage.gold)) {
    return failure("invalid-gold", "Gold must be an array when provided.");
  }
  if (Array.isArray(stage.gold) && stage.gold.some((position) => !validPosition(position))) {
    return failure("invalid-gold", "Gold must have in-bounds integer positions.");
  }
  const gold = stage.gold ?? [];

  const goals = [];
  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      if (stage.tiles[y][x] === "E") goals.push({ x, y });
    }
  }
  if (goals.length !== 1) {
    return failure("invalid-goal-count", "Stage must contain exactly one Goal.");
  }

  const actors = [stage.player, ...stage.guards];
  const occupied = new Set();
  for (const [index, position] of actors.entries()) {
    const key = coordinateKey(position);
    if (occupied.has(key)) return failure("overlapping-actors", "Player and Guards cannot share a cell.");
    occupied.add(key);
    if (stage.tiles[position.y][position.x] !== " ") {
      return failure("actor-terrain-overlap", `Actor ${index === 0 ? "Player" : `Guard ${index}`} overlaps terrain.`);
    }
  }
  const goldCells = new Set();
  for (const position of gold) {
    const key = coordinateKey(position);
    if (goldCells.has(key)) return failure("duplicate-gold", "Gold positions must be unique.");
    if (occupied.has(key)) return failure("gold-actor-overlap", "Gold cannot overlap an initial actor.");
    if (key === coordinateKey(goals[0])) return failure("gold-goal-overlap", "Gold cannot overlap the Goal.");
    if (stage.tiles[position.y][position.x] !== " ") {
      return failure("gold-terrain-overlap", "Gold must be placed on empty terrain.");
    }
    goldCells.add(key);
  }

  // Parser order is row-major, and Guard order changes Core update order.
  const rowMajor = [...stage.guards].sort((a, b) => a.y - b.y || a.x - b.x);
  if (rowMajor.some((guard, index) => guard.x !== stage.guards[index].x || guard.y !== stage.guards[index].y)) {
    return failure("guard-order-not-representable", "Guard array order differs from map reading order.");
  }
  return { ok: true, goals };
}

/** Parse a 13x9 map into an independent Stage snapshot. */
export function parseMapText(text) {
  if (typeof text !== "string") return failure("invalid-input", "Map must be text.");
  let source = text.replaceAll("\r\n", "\n");
  if (source.endsWith("\n")) source = source.slice(0, -1);
  const rows = source.split("\n");
  if (rows.length !== HEIGHT) {
    return failure("invalid-row-count", `Map must contain exactly ${HEIGHT} rows.`, Math.min(rows.length, HEIGHT) + 1, null);
  }
  for (let y = 0; y < HEIGHT; y += 1) {
    if (rows[y].length !== WIDTH) {
      return failure("invalid-row-width", `Row ${y + 1} must contain exactly ${WIDTH} characters.`, y + 1, rows[y].length < WIDTH ? rows[y].length + 1 : WIDTH + 1);
    }
  }

  const tiles = [];
  let player = null;
  const guards = [];
  const gold = [];
  let goals = 0;
  for (let y = 0; y < HEIGHT; y += 1) {
    let row = "";
    for (let x = 0; x < WIDTH; x += 1) {
      const symbol = rows[y][x];
      if (!MAP_SYMBOLS.has(symbol)) {
        return failure("invalid-symbol", `Unsupported map symbol ${JSON.stringify(symbol)} at row ${y + 1}, column ${x + 1}.`, y + 1, x + 1);
      }
      if (symbol === "P") {
        if (player) return failure("player-count", "Map must contain exactly one Player.", y + 1, x + 1);
        player = { x, y };
        row += " ";
      } else if (symbol === "G") {
        guards.push({ x, y });
        row += " ";
      } else if (symbol === "$") {
        gold.push({ x, y });
        row += " ";
      } else {
        if (symbol === "E") goals += 1;
        row += symbol;
      }
    }
    tiles.push(row);
  }
  if (!player) return failure("player-count", "Map must contain exactly one Player.");
  if (guards.length > 2) return failure("guard-count", "Map may contain at most 2 Guards.");
  if (goals !== 1) return failure("goal-count", "Map must contain exactly one Goal.");

  return {
    ok: true,
    stage: {
      id: "map-editor-stage",
      title: "Map Editor Stage",
      theme: "Created from map text",
      tiles,
      player,
      guards,
      gold,
    },
  };
}

/** Format a representable Stage without changing it. */
export function formatStageAsMapText(stage) {
  const validation = validateStage(stage);
  if (!validation.ok) return validation;

  const rows = stage.tiles.map((row) => [...row]);
  for (const position of stage.gold ?? []) rows[position.y][position.x] = "$";
  for (const position of stage.guards) rows[position.y][position.x] = "G";
  rows[stage.player.y][stage.player.x] = "P";
  return { ok: true, text: rows.map((row) => row.join("")).join("\n") };
}
