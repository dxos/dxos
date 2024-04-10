//
// Copyright 2022 DXOS.org
//

import { data } from './data';

const capitalize = (input: string): string => input.charAt(0).toUpperCase() + input.slice(1);

// TODO(burdon): Rename package (for related things to do with human readable hashes?)
export const generateName = (input: string): string => {
  const split = (input.length * 2) / 3;
  const firstInput = input.substring(0, split);
  const secondInput = input.substring(split);
  const adjective = capitalize(data.adjectives[parseInt(firstInput, 16) % data.adjectives.length]);
  const animal = capitalize(data.animals[parseInt(secondInput, 16) % data.animals.length]);
  return `${adjective} ${animal}`;
};
