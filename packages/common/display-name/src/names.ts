//
// Copyright 2022 DXOS.org
//

import adjectives from './adjectives';
import animals from './animals';

const capitalize = (input: string): string => input.charAt(0).toUpperCase() + input.slice(1);

export const generateName = (input: string): string => {
  const split = (input.length * 2) / 3;
  const firstInput = input.substring(0, split);
  const secondInput = input.substring(split);
  const adjective = capitalize(adjectives[parseInt(firstInput, 16) % adjectives.length]);
  const animal = capitalize(animals[parseInt(secondInput, 16) % animals.length]);

  return `${adjective} ${animal}`;
};
