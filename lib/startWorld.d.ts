import Engine from '@civ-clone/core-engine/Engine';
import RuleRegistry from '@civ-clone/core-rule/RuleRegistry';
import World from '@civ-clone/core-world/World';
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
  topologyIds?: string[];
  check?: (topologyId: string) => void;
}
export declare class UnsupportedTopologyError extends Error {}
/**
 * Builds the game's world, from the game's options (`topologyId`, `height`, `width`, `landCoverage`, `landSize`,
 * `maxIterations`), each `defaults`' value when not set: the grid is checked (`topologyIds`, then `check`), a generator
 * is picked (`PickGenerator`), the size is checked against the grid it really lays out, before anything is generated,
 * and then the world is built.
 */
export declare const startWorld: (
  ruleRegistry: RuleRegistry,
  engine: Engine,
  { defaults, topologyIds, check }: StartWorldOptions
) => World;
export default startWorld;
