import Tile, { IYieldMap } from '@civ-clone/core-world/Tile';
import Engine from '@civ-clone/core-engine/Engine';
import Terrain from '@civ-clone/core-terrain/Terrain';
import World from '@civ-clone/core-world/World';
export interface StartTileRules {
  TerrainTypes: (typeof Terrain)[];
  weights: IYieldMap[];
  minimumRoom: number;
  tooClose: (usedStartSquare: Tile, tile: Tile) => boolean;
}
/**
 * Where players start. One picker remembers, for each world, its candidate tiles, best first, and how many tiles of
 * `TerrainTypes` are on each tile's landmass, so a world is ranked once however many players start on it.
 */
export declare class StartTilePicker {
  private readonly rules;
  private readonly startTiles;
  private readonly room;
  constructor(rules: StartTileRules);
  /**
   * The tiles of `world` a player could start on, best first (`rankStartTiles`). Ranked the first time `world` is
   * asked about, between `world:generate-start-tiles` and `world:start-tiles` (with the list), emitted on `engine`.
   */
  candidates(world: World, engine: Engine): Tile[];
  roomByTile(world: World): Map<Tile, number>;
  /**
   * A start tile for the next player, chosen with one draw of `randomNumberGenerator` among the candidates not
   * `tooClose` to any of `usedStartSquares`: those on a landmass with `minimumRoom`, or, with no room anywhere, those on
   * whichever landmass has the most. `undefined` if every candidate is too close.
   */
  pick(
    world: World,
    usedStartSquares: Tile[],
    engine: Engine,
    randomNumberGenerator: () => number
  ): Tile;
}
export default StartTilePicker;
