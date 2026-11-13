import Generator from '@civ-clone/core-world-generator/Generator';
import GeneratorRegistry from '@civ-clone/core-world-generator/GeneratorRegistry';

/**
 * One of the registered world generators, chosen with one draw of `randomNumberGenerator`. Throws a `TypeError`, without
 * drawing, when none is registered.
 */
export const pickGenerator = (
  generatorRegistry: GeneratorRegistry,
  randomNumberGenerator: () => number
): typeof Generator => {
  const availableGenerators = generatorRegistry.entries();

  if (availableGenerators.length === 0) {
    throw new TypeError('No available `World` generators.');
  }

  return availableGenerators[
    Math.floor(availableGenerators.length * randomNumberGenerator())
  ];
};

export default pickGenerator;
