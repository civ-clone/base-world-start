"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pickGenerator = void 0;
/**
 * One of the registered world generators, chosen with one draw of `randomNumberGenerator`. Throws a `TypeError`, without
 * drawing, when none is registered.
 */
const pickGenerator = (generatorRegistry, randomNumberGenerator) => {
    const availableGenerators = generatorRegistry.entries();
    if (availableGenerators.length === 0) {
        throw new TypeError('No available `World` generators.');
    }
    return availableGenerators[Math.floor(availableGenerators.length * randomNumberGenerator())];
};
exports.pickGenerator = pickGenerator;
exports.default = exports.pickGenerator;
//# sourceMappingURL=pickGenerator.js.map