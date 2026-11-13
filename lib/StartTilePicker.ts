import Tile, { IYieldMap } from '@civ-clone/core-world/Tile';
import Engine from '@civ-clone/core-engine/Engine';
import Terrain from '@civ-clone/core-terrain/Terrain';
import World from '@civ-clone/core-world/World';
import { rankStartTiles } from '@civ-clone/base-player/lib/startTiles';

export interface StartTileRules {
  // The terrains a player can start on.
  TerrainTypes: (typeof Terrain)[];
  // How each tile around a candidate is scored (base-player's `rankStartTiles`).
  weights: IYieldMap[];
  // How many tiles of `TerrainTypes` a landmass needs for a player to start on it, while any landmass has that many.
  minimumRoom: number;
  // A candidate `tile` too close to a start square already used.
  tooClose: (usedStartSquare: Tile, tile: Tile) => boolean;
}

/**
 * Where players start. One picker remembers, for each world, its candidate tiles, best first, and how many tiles of
 * `TerrainTypes` are on each tile's landmass, so a world is ranked once however many players start on it.
 */
export class StartTilePicker {
  private readonly rules: StartTileRules;
  private readonly startTiles: Map<World, Tile[]> = new Map();
  private readonly room: Map<World, Map<Tile, number>> = new Map();

  constructor(rules: StartTileRules) {
    this.rules = rules;
  }

  /**
   * The tiles of `world` a player could start on, best first (`rankStartTiles`). Ranked the first time `world` is
   * asked about, between `world:generate-start-tiles` and `world:start-tiles` (with the list), emitted on `engine`.
   */
  candidates(world: World, engine: Engine): Tile[] {
    if (!this.startTiles.has(world)) {
      engine.emit('world:generate-start-tiles');

      const startingSquares = rankStartTiles(
        world,
        this.rules.TerrainTypes,
        this.rules.weights
      );

      this.startTiles.set(world, startingSquares);

      engine.emit('world:start-tiles', startingSquares);
    }

    return this.startTiles.get(world)!;
  }

  // How many tiles of `TerrainTypes` are on each tile's landmass.
  roomByTile(world: World): Map<Tile, number> {
    if (!this.room.has(world)) {
      const counts = new Map<Tile, number>(),
        isStartTerrain = (tile: Tile): boolean =>
          this.rules.TerrainTypes.some(
            (TerrainType) => tile.terrain() instanceof TerrainType
          );

      world.landMasses().forEach((landMass) => {
        const tiles = landMass.tiles(),
          count = tiles.filter(isStartTerrain).length;

        tiles.forEach((tile) => counts.set(tile, count));
      });

      this.room.set(world, counts);
    }

    return this.room.get(world)!;
  }

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
  ): Tile {
    const counts = this.roomByTile(world),
      freeSquares = this.candidates(world, engine).filter(
        (tile: Tile): boolean =>
          !usedStartSquares.some((startSquare: Tile): boolean =>
            this.rules.tooClose(startSquare, tile)
          )
      ),
      roomySquares = freeSquares.filter(
        (tile: Tile): boolean =>
          (counts.get(tile) ?? 0) >= this.rules.minimumRoom
      ),
      // With no room anywhere, start on whichever landmass has the most.
      most = freeSquares.reduce(
        (most: number, tile: Tile): number =>
          Math.max(most, counts.get(tile) ?? 0),
        0
      ),
      startingSquares =
        roomySquares.length > 0
          ? roomySquares
          : freeSquares.filter(
              (tile: Tile): boolean => (counts.get(tile) ?? 0) === most
            );

    return startingSquares[
      Math.floor(startingSquares.length * randomNumberGenerator())
    ];
  }
}

export default StartTilePicker;
