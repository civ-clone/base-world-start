"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StartTilePicker = void 0;
const startTiles_1 = require("@civ-clone/base-player/lib/startTiles");
/**
 * Where players start. One picker remembers, for each world, its candidate tiles, best first, and how many tiles of
 * `TerrainTypes` are on each tile's landmass, so a world is ranked once however many players start on it.
 */
class StartTilePicker {
    constructor(rules) {
        this.startTiles = new Map();
        this.room = new Map();
        this.rules = rules;
    }
    /**
     * The tiles of `world` a player could start on, best first (`rankStartTiles`). Ranked the first time `world` is
     * asked about, between `world:generate-start-tiles` and `world:start-tiles` (with the list), emitted on `engine`.
     */
    candidates(world, engine) {
        if (!this.startTiles.has(world)) {
            engine.emit('world:generate-start-tiles');
            const startingSquares = (0, startTiles_1.rankStartTiles)(world, this.rules.TerrainTypes, this.rules.weights);
            this.startTiles.set(world, startingSquares);
            engine.emit('world:start-tiles', startingSquares);
        }
        return this.startTiles.get(world);
    }
    // How many tiles of `TerrainTypes` are on each tile's landmass.
    roomByTile(world) {
        if (!this.room.has(world)) {
            const counts = new Map(), isStartTerrain = (tile) => this.rules.TerrainTypes.some((TerrainType) => tile.terrain() instanceof TerrainType);
            world.landMasses().forEach((landMass) => {
                const tiles = landMass.tiles(), count = tiles.filter(isStartTerrain).length;
                tiles.forEach((tile) => counts.set(tile, count));
            });
            this.room.set(world, counts);
        }
        return this.room.get(world);
    }
    /**
     * A start tile for the next player, chosen with one draw of `randomNumberGenerator` among the candidates not
     * `tooClose` to any of `usedStartSquares`: those on a landmass with `minimumRoom`, or, with no room anywhere, those on
     * whichever landmass has the most. `undefined` if every candidate is too close.
     */
    pick(world, usedStartSquares, engine, randomNumberGenerator) {
        const counts = this.roomByTile(world), freeSquares = this.candidates(world, engine).filter((tile) => !usedStartSquares.some((startSquare) => this.rules.tooClose(startSquare, tile))), roomySquares = freeSquares.filter((tile) => { var _a; return ((_a = counts.get(tile)) !== null && _a !== void 0 ? _a : 0) >= this.rules.minimumRoom; }), 
        // With no room anywhere, start on whichever landmass has the most.
        most = freeSquares.reduce((most, tile) => { var _a; return Math.max(most, (_a = counts.get(tile)) !== null && _a !== void 0 ? _a : 0); }, 0), startingSquares = roomySquares.length > 0
            ? roomySquares
            : freeSquares.filter((tile) => { var _a; return ((_a = counts.get(tile)) !== null && _a !== void 0 ? _a : 0) === most; });
        return startingSquares[Math.floor(startingSquares.length * randomNumberGenerator())];
    }
}
exports.StartTilePicker = StartTilePicker;
exports.default = StartTilePicker;
//# sourceMappingURL=StartTilePicker.js.map