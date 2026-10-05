// This is only the data needed to display a sample board. Gameplay state follows later.
export function createSampleState(stage) {
  return {
    width: stage.tiles[0].length,
    height: stage.tiles.length,
    tiles: stage.tiles.map((row) => [...row]),
    player: { ...stage.player },
    guards: stage.guards.map((guard) => ({ ...guard })),
  };
}
