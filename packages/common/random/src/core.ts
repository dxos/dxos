//
// Copyright 2023 DXOS.org
//

import seedrandom from 'seedrandom';

let rand = seedrandom();

export const seed = (seed: string) => {
  rand = seedrandom(seed);
};

export const random = () => rand();
