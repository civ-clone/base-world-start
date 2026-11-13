import Engine from '@civ-clone/core-engine/Engine';
import PickGenerator from '@civ-clone/core-world-generator/Rules/PickGenerator';
import RuleRegistry from '@civ-clone/core-rule/RuleRegistry';
import World from '@civ-clone/core-world/World';

// What a ruleset's world is built with when a game option doesn't say: the grid (one of core-world's `topologyIds`),
//  the size, and the generator's own settings.
export interface WorldDefaults {
  topologyId: string;
  height: number;
  width: number;
  landCoverage: number;
  landSize: number;
  maxIterations: number;
}

export interface StartWorldOptions {
  defaults: WorldDefaults;
  // The grids the ruleset's world can be laid out on. Any of core-world's `topologyIds` if not given.
  topologyIds?: string[];
  // Asked of the grid before a generator is picked, so a ruleset can refuse a combination of options by throwing.
  check?: (topologyId: string) => void;
}

export class UnsupportedTopologyError extends Error {}

/**
 * Builds the game's world, from the game's options (`topologyId`, `height`, `width`, `landCoverage`, `landSize`,
 * `maxIterations`), each `defaults`' value when not set: the grid is checked (`topologyIds`, then `check`), a generator
 * is picked (`PickGenerator`), the size is checked against the grid it really lays out, before anything is generated,
 * and then the world is built.
 */
export const startWorld = (
  ruleRegistry: RuleRegistry,
  engine: Engine,
  { defaults, topologyIds, check }: StartWorldOptions
): World => {
  const topologyId: string = engine.option('topologyId', defaults.topologyId);

  if (topologyIds !== undefined && !topologyIds.includes(topologyId)) {
    throw new UnsupportedTopologyError(
      `start: 'topologyId' is '${topologyId}', but this world can only be laid out on ${topologyIds
        .map((id: string): string => `'${id}'`)
        .join(', ')}.`
    );
  }

  if (check) {
    check(topologyId);
  }

  const [Generator] = ruleRegistry.process(PickGenerator),
    generator = new Generator(
      parseInt(engine.option('height', defaults.height), 10),
      parseInt(engine.option('width', defaults.width), 10),
      {
        landCoverage: parseFloat(
          engine.option('landCoverage', defaults.landCoverage)
        ),
        landSize: parseFloat(engine.option('landSize', defaults.landSize)),
        maxIterations: parseInt(
          engine.option('maxIterations', defaults.maxIterations),
          10
        ),
        topologyId,
      }
    );

  // Check the grid against the size the generator really lays out (a generator may pick the nearest of its fixed
  // maps) before anything is generated: an unknown id, or an odd height on a grid that wraps north to south, throws
  // here rather than part way through building the world.
  generator.topology().validate(generator.width(), generator.height());

  const world: World = new World(generator, ruleRegistry);

  world.build();

  return world;
};

export default startWorld;
