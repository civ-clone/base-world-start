"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startWorld = exports.UnsupportedTopologyError = void 0;
const PickGenerator_1 = require("@civ-clone/core-world-generator/Rules/PickGenerator");
const World_1 = require("@civ-clone/core-world/World");
class UnsupportedTopologyError extends Error {
}
exports.UnsupportedTopologyError = UnsupportedTopologyError;
/**
 * Builds the game's world, from the game's options (`topologyId`, `height`, `width`, `landCoverage`, `landSize`,
 * `maxIterations`), each `defaults`' value when not set: the grid is checked (`topologyIds`, then `check`), a generator
 * is picked (`PickGenerator`), the size is checked against the grid it really lays out, before anything is generated,
 * and then the world is built.
 */
const startWorld = (ruleRegistry, engine, { defaults, topologyIds, check }) => {
    const topologyId = engine.option('topologyId', defaults.topologyId);
    if (topologyIds !== undefined && !topologyIds.includes(topologyId)) {
        throw new UnsupportedTopologyError(`start: 'topologyId' is '${topologyId}', but this world can only be laid out on ${topologyIds
            .map((id) => `'${id}'`)
            .join(', ')}.`);
    }
    if (check) {
        check(topologyId);
    }
    const [Generator] = ruleRegistry.process(PickGenerator_1.default), generator = new Generator(parseInt(engine.option('height', defaults.height), 10), parseInt(engine.option('width', defaults.width), 10), {
        landCoverage: parseFloat(engine.option('landCoverage', defaults.landCoverage)),
        landSize: parseFloat(engine.option('landSize', defaults.landSize)),
        maxIterations: parseInt(engine.option('maxIterations', defaults.maxIterations), 10),
        topologyId,
    });
    // Check the grid against the size the generator really lays out (a generator may pick the nearest of its fixed
    // maps) before anything is generated: an unknown id, or an odd height on a grid that wraps north to south, throws
    // here rather than part way through building the world.
    generator.topology().validate(generator.width(), generator.height());
    const world = new World_1.default(generator, ruleRegistry);
    world.build();
    return world;
};
exports.startWorld = startWorld;
exports.default = exports.startWorld;
//# sourceMappingURL=startWorld.js.map