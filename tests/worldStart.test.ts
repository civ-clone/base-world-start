import { UnsupportedTopologyError, startWorld } from '../lib/startWorld';
import Built from '@civ-clone/core-world/Rules/Built';
import Effect from '@civ-clone/core-rule/Effect';
import Engine from '@civ-clone/core-engine/Engine';
import Generator from '@civ-clone/core-world-generator/Generator';
import GeneratorRegistry from '@civ-clone/core-world-generator/GeneratorRegistry';
import PickGenerator from '@civ-clone/core-world-generator/Rules/PickGenerator';
import RuleRegistry from '@civ-clone/core-rule/RuleRegistry';
import StartTilePicker from '../lib/StartTilePicker';
import Terrain from '@civ-clone/core-terrain/Terrain';
import Tile from '@civ-clone/core-world/Tile';
import { Water } from '@civ-clone/core-terrain/Types';
import World from '@civ-clone/core-world/World';
import { expect } from 'chai';
import pickGenerator from '../lib/pickGenerator';

class Deep extends Water {}
class Meadow extends Terrain {}
class Scrub extends Terrain {}

// Every generator built, and how many generated.
let generators: Generator[] = [],
  generated = 0;

// An all-water world, so that building it needs no rules of its own.
class WaterGenerator extends Generator {
  constructor(
    height: number,
    width: number,
    options: { [key: string]: any } = {}
  ) {
    super(height, width, options);

    generators.push(this);
  }

  async generate(): Promise<Terrain[]> {
    generated++;

    return Array.from(
      { length: this.height() * this.width() },
      (): Terrain => new Deep()
    );
  }
}

const defaults = {
    topologyId: 'square',
    height: 6,
    width: 8,
    landCoverage: 0.3,
    landSize: 0.1,
    maxIterations: 5,
  },
  setUp = (options: { [key: string]: any } = {}) => {
    const ruleRegistry = new RuleRegistry(),
      engine = new Engine(),
      order: string[] = [];
    let resolveBuilt: (world: World) => void = () => {};

    Object.entries(options).forEach(([key, value]) =>
      engine.setOption(key, value)
    );

    ruleRegistry.register(
      new PickGenerator(
        new Effect(() => {
          order.push('pick');

          return WaterGenerator;
        })
      ),
      new Built(new Effect((world: World): void => resolveBuilt(world)))
    );

    return {
      built: new Promise<World>((resolve) => (resolveBuilt = resolve)),
      engine,
      order,
      ruleRegistry,
    };
  };

describe('startWorld', (): void => {
  beforeEach((): void => {
    generators = [];
    generated = 0;
  });

  it('builds the world with the defaults when no option is set', async (): Promise<void> => {
    const { built, engine, ruleRegistry } = setUp(),
      world = startWorld(ruleRegistry, engine, { defaults });

    expect(await built).to.equal(world);
    expect(generators).to.have.length(1);
    expect(generators[0].options()).to.deep.equal({
      landCoverage: 0.3,
      landSize: 0.1,
      maxIterations: 5,
      topologyId: 'square',
    });
    expect(world.width()).to.equal(8);
    expect(world.height()).to.equal(6);
    expect(world.topologyId()).to.equal('square');
    expect(generated).to.equal(1);
  });

  it('reads each option, as a number, over its default', async (): Promise<void> => {
    const { built, engine, ruleRegistry } = setUp({
      height: '4',
      width: '10',
      landCoverage: '0.5',
      landSize: '0.25',
      maxIterations: '7',
      topologyId: 'hex-odd-r',
    });

    startWorld(ruleRegistry, engine, { defaults });

    const world = await built;

    expect(generators[0].options()).to.deep.equal({
      landCoverage: 0.5,
      landSize: 0.25,
      maxIterations: 7,
      topologyId: 'hex-odd-r',
    });
    expect(world.width()).to.equal(10);
    expect(world.height()).to.equal(4);
    expect(world.topologyId()).to.equal('hex-odd-r');
  });

  it('uses the default grid it is given', async (): Promise<void> => {
    const { built, engine, ruleRegistry } = setUp();

    startWorld(ruleRegistry, engine, {
      defaults: { ...defaults, topologyId: 'staggered-iso' },
      topologyIds: ['staggered-iso'],
    });

    expect((await built).topologyId()).to.equal('staggered-iso');
  });

  it('refuses a grid not in topologyIds before picking a generator', (): void => {
    const { engine, order, ruleRegistry } = setUp({ topologyId: 'square' });

    expect(() =>
      startWorld(ruleRegistry, engine, {
        defaults,
        topologyIds: ['staggered-iso', 'hex-odd-r'],
      })
    ).to.throw(
      UnsupportedTopologyError,
      "start: 'topologyId' is 'square', but this world can only be laid out on 'staggered-iso', 'hex-odd-r'."
    );
    expect(order).to.eql([]);
    expect(generators).to.have.length(0);
  });

  it('asks check after topologyIds and before picking a generator', (): void => {
    const { engine, order, ruleRegistry } = setUp({ topologyId: 'hex-odd-r' });

    expect(() =>
      startWorld(ruleRegistry, engine, {
        defaults,
        topologyIds: ['hex-odd-r'],
        check: (topologyId: string): void => {
          order.push(`check ${topologyId}`);

          throw new Error('refused');
        },
      })
    ).to.throw(Error, 'refused');
    expect(order).to.eql(['check hex-odd-r']);
    expect(generators).to.have.length(0);
  });

  it('refuses a size the grid cannot make after picking, before generating', (): void => {
    const { engine, order, ruleRegistry } = setUp({
      height: 7,
      topologyId: 'hex-odd-r',
    });

    expect(() => startWorld(ruleRegistry, engine, { defaults })).to.throw(
      Error,
      'the height must be even'
    );
    expect(order).to.eql(['pick']);
    expect(generators).to.have.length(1);
    expect(generated).to.equal(0);
  });

  it('lets core-world refuse a grid it does not know', (): void => {
    const { engine, ruleRegistry } = setUp({ topologyId: 'triangle' });

    expect(() => startWorld(ruleRegistry, engine, { defaults })).to.throw(
      Error,
      "unknown topology 'triangle'"
    );
    expect(generated).to.equal(0);
  });
});

describe('pickGenerator', (): void => {
  class First extends WaterGenerator {}
  class Second extends WaterGenerator {}
  class Third extends WaterGenerator {}

  it('picks by one draw', (): void => {
    const generatorRegistry = new GeneratorRegistry();

    generatorRegistry.register(First, Second, Third);

    [
      [0, First],
      [0.34, Second],
      [0.999, Third],
    ].forEach(([draw, expected]) => {
      let draws = 0;

      expect(
        pickGenerator(generatorRegistry, () => {
          draws++;

          return draw as number;
        })
      ).to.equal(expected);
      expect(draws).to.equal(1);
    });
  });

  it('throws without drawing when there is no generator', (): void => {
    let draws = 0;

    expect(() =>
      pickGenerator(new GeneratorRegistry(), () => {
        draws++;

        return 0;
      })
    ).to.throw(TypeError, 'No available `World` generators.');
    expect(draws).to.equal(0);
  });
});

describe('StartTilePicker', (): void => {
  // A row of tiles at x = 0..n: each tile's own score is its `score`, and its surrounding area is itself and its
  //  neighbours in the row. `landMass` groups tiles by index.
  const row = (
      specs: { terrain: typeof Terrain; score: number; landMass: number }[]
    ) => {
      const tiles: Tile[] = [],
        scored: any[][] = [];

      specs.forEach(({ terrain, score }, x) =>
        tiles.push({
          x: () => x,
          terrain: () => new terrain(),
          score: (player: any, weights: any) => {
            scored.push([x, player, weights]);

            return score;
          },
          getSurroundingArea: () => ({
            entries: () => tiles.slice(Math.max(0, x - 1), x + 2),
          }),
        } as unknown as Tile)
      );

      const landMasses = Array.from(
          new Set(specs.map(({ landMass }) => landMass))
        ).map((landMass) => ({
          tiles: () =>
            tiles.filter((tile, x) => specs[x].landMass === landMass),
        })),
        world = {
          entries: () => tiles,
          landMasses: () => landMasses,
        } as unknown as World;

      return { tiles, world, scored };
    },
    events = (engine: Engine) => {
      const seen: any[][] = [];

      engine.on('world:generate-start-tiles', (...args: any[]) =>
        seen.push(['generate', ...args])
      );
      engine.on('world:start-tiles', (...args: any[]) =>
        seen.push(['start-tiles', ...args])
      );

      return seen;
    },
    weights: any = [['Weight', 2]],
    distance = (a: Tile, b: Tile): number => Math.abs(a.x() - b.x());

  it('ranks the start terrain tiles of a world once, best area first, between two events', (): void => {
    const { tiles, world, scored } = row([
        { terrain: Meadow, score: 1, landMass: 0 },
        { terrain: Scrub, score: 9, landMass: 0 },
        { terrain: Meadow, score: 2, landMass: 0 },
        { terrain: Meadow, score: 4, landMass: 0 },
        { terrain: Deep, score: 0, landMass: 1 },
      ]),
      engine = new Engine(),
      seen = events(engine),
      picker = new StartTilePicker({
        TerrainTypes: [Meadow],
        weights,
        minimumRoom: 0,
        tooClose: () => false,
      });

    // Area scores: 0 → 10, 2 → 15, 3 → 6.
    const ranked = picker.candidates(world, engine);

    expect(ranked).to.eql([tiles[2], tiles[0], tiles[3]]);
    expect(seen).to.eql([['generate'], ['start-tiles', ranked]]);
    expect(scored.every(([, player, w]) => player === null && w === weights)).to
      .true;

    expect(picker.candidates(world, engine)).to.equal(ranked);
    expect(seen).to.have.length(2);
  });

  it('keeps each picker’s worlds to itself', (): void => {
    const { world } = row([{ terrain: Meadow, score: 1, landMass: 0 }]),
      engine = new Engine(),
      seen = events(engine),
      rules = {
        TerrainTypes: [Meadow],
        weights,
        minimumRoom: 0,
        tooClose: () => false,
      };

    new StartTilePicker(rules).candidates(world, engine);
    new StartTilePicker(rules).candidates(world, engine);

    expect(seen).to.have.length(4);
  });

  it('counts the start terrain on each tile’s landmass', (): void => {
    const { tiles, world } = row([
        { terrain: Meadow, score: 1, landMass: 0 },
        { terrain: Scrub, score: 1, landMass: 0 },
        { terrain: Meadow, score: 1, landMass: 0 },
        { terrain: Meadow, score: 1, landMass: 1 },
      ]),
      picker = new StartTilePicker({
        TerrainTypes: [Meadow],
        weights,
        minimumRoom: 0,
        tooClose: () => false,
      }),
      room = picker.roomByTile(world);

    expect(tiles.map((tile) => room.get(tile))).to.eql([2, 2, 2, 1]);
    expect(picker.roomByTile(world)).to.equal(room);
  });

  it('picks with one draw among those not too close to a used start square', (): void => {
    const { tiles, world } = row(
        Array.from({ length: 6 }, (_, x) => ({
          terrain: Meadow,
          score: x,
          landMass: 0,
        }))
      ),
      picker = new StartTilePicker({
        TerrainTypes: [Meadow],
        weights,
        minimumRoom: 0,
        tooClose: (used: Tile, tile: Tile) => distance(used, tile) <= 2,
      }),
      asked: any[][] = [],
      draws: number[] = [];

    // Area scores 1, 3, 6, 9, 12, 9, so ranked 4, 3, 5, 2, 1, 0. With 4 used, only 1 and 0 are free.
    const pickedFirst = picker.pick(world, [tiles[4]], new Engine(), () => {
      draws.push(0);

      return 0;
    });
    const pickedLast = picker.pick(world, [tiles[4]], new Engine(), () => {
      draws.push(0.99);

      return 0.99;
    });

    expect(pickedFirst).to.equal(tiles[1]);
    expect(pickedLast).to.equal(tiles[0]);
    expect(draws).to.eql([0, 0.99]);

    new StartTilePicker({
      TerrainTypes: [Meadow],
      weights,
      minimumRoom: 0,
      tooClose: (used: Tile, tile: Tile) => {
        asked.push([used, tile]);

        return false;
      },
    }).pick(world, [tiles[0]], new Engine(), () => 0);

    expect(asked.every(([used]) => used === tiles[0])).to.true;
    expect(asked).to.have.length(6);
  });

  it('prefers a landmass with room, and with none, the landmass with the most', (): void => {
    const { tiles, world } = row([
        // An island of 1, best scored.
        { terrain: Meadow, score: 50, landMass: 0 },
        { terrain: Deep, score: 0, landMass: 1 },
        // A landmass of 3.
        { terrain: Meadow, score: 1, landMass: 2 },
        { terrain: Meadow, score: 1, landMass: 2 },
        { terrain: Meadow, score: 1, landMass: 2 },
      ]),
      picker = (minimumRoom: number) =>
        new StartTilePicker({
          TerrainTypes: [Meadow],
          weights,
          minimumRoom,
          tooClose: (used: Tile, tile: Tile) => used === tile,
        });

    expect(picker(3).pick(world, [], new Engine(), () => 0)).to.equal(tiles[3]);
    // No room anywhere: the landmass with the most, 3.
    expect(picker(4).pick(world, [], new Engine(), () => 0)).to.equal(tiles[3]);
    // Room on both: the best.
    expect(picker(1).pick(world, [], new Engine(), () => 0)).to.equal(tiles[0]);
    // The landmass of 3 full: the island has the most room left.
    expect(
      picker(4).pick(world, tiles.slice(2), new Engine(), () => 0)
    ).to.equal(tiles[0]);
  });

  it('still draws when every candidate is too close, and picks nothing', (): void => {
    const { tiles, world } = row([{ terrain: Meadow, score: 1, landMass: 0 }]);
    let draws = 0;

    expect(
      new StartTilePicker({
        TerrainTypes: [Meadow],
        weights,
        minimumRoom: 0,
        tooClose: () => true,
      }).pick(world, [tiles[0]], new Engine(), () => {
        draws++;

        return 0.5;
      })
    ).to.undefined;
    expect(draws).to.equal(1);
  });
});
