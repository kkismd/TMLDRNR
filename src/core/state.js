export function createSampleState(stage) {
  return {
    width: stage.tiles[0].length,
    height: stage.tiles.length,
    tiles: stage.tiles.map((row) => [...row]),
    player: { ...stage.player },
    guards: stage.guards.map((guard) => ({ ...guard })),
    turn: 0,
    status: "playing",
  };
}
