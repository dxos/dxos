//
// Copyright 2022 DXOS.org
//

import fs from 'fs';
import yaml from 'js-yaml';
import uniq from 'uniq';

import { faker } from '@dxos/random';

faker.seed(0xdeadbeef);

const maxWordLength = 12;

const clean = (array: string[]) => {
  const unique = uniq(array)
    .filter((word) => word.length <= maxWordLength)
    .map((word) => word.toLowerCase());
  unique.sort();
  return unique;
};

const select = (array: string[], n: number) => {
  const unique = faker.helpers.uniqueArray(array, n);
  unique.sort();
  return unique;
};

const parse = (source: string, target: string) => {
  const content = yaml.load(String(fs.readFileSync(source))) as any;
  const { animals, adjectives } = content;

  const cleaned = {
    animals: clean(animals),
    adjectives: clean(adjectives),
  };

  const selected = {
    animals: select(cleaned.animals, 256),
    adjectives: select(cleaned.adjectives, 256),
  };

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({
      animals: selected.animals.length,
      adjectives: selected.adjectives.length,
    }),
  );

  fs.writeFileSync(source, JSON.stringify(cleaned, undefined, 2));
  fs.writeFileSync(target, JSON.stringify(selected, undefined, 2));
};

parse('./scripts/raw.json', './data/words.json');
