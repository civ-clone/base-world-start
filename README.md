# base-world-start

Building blocks for starting a game's world. The ruleset keeps its own rules (`Start`, `PickGenerator`,
`PickStartTile`), their order and its numbers, and builds their effects from these:

- `lib/startWorld`: `startWorld(ruleRegistry, engine, { defaults, topologyIds?, check? })` builds the world from the
  game's options (`topologyId`, `height`, `width`, `landCoverage`, `landSize`, `maxIterations`), each `defaults`' value
  when not set. The grid must be one of `topologyIds`, when given (otherwise `UnsupportedTopologyError`), then `check`
  may refuse it by throwing. Only then is a generator picked (`PickGenerator`), and the size is checked against the grid
  it really lays out before anything is generated. Returns the world.
- `lib/pickGenerator`: `pickGenerator(generatorRegistry, randomNumberGenerator)` is one of the registered generators,
  with one draw; with none, a `TypeError`, without drawing.
- `lib/StartTilePicker`: `new StartTilePicker({ TerrainTypes, weights, minimumRoom, tooClose })`, once, for every world.
  `pick(world, usedStartSquares, engine, randomNumberGenerator)` chooses, with one draw, among the tiles of
  `TerrainTypes` not `tooClose` to a used start square, ranked by base-player's `rankStartTiles`: those on a landmass
  with at least `minimumRoom` tiles of `TerrainTypes`, or, with no room anywhere, those on whichever landmass has the
  most. Each world is ranked once, between `world:generate-start-tiles` and `world:start-tiles` (with the list).

A library: no `main`, so it registers nothing on its own. Import what you need, for example
`@civ-clone/base-world-start/lib/startWorld`.
