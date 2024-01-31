//
// Copyright 2023 DXOS.org
//

import { type Range } from './defs';
import { random } from './random';

export const text = {
  word: () => {
    return random.element(data.words);
  },

  sentence: (range: Range = { min: 8, max: 16 }) => {
    return (
      text.word().charAt(0).toUpperCase() +
      random
        .array(random.number(range))
        .map(() => text.word())
        .join(' ') +
      '.'
    );
  },

  paragraph: (range: Range = { min: 3, max: 8 }) => {
    return random
      .array(random.number(range))
      .map(() => text.sentence())
      .join(' ');
  },
};

const data = {
  // Lorem ipsum.
  words: [
    'ad',
    'adipisicing',
    'aliqua',
    'aliquip',
    'amet',
    'anim',
    'aute',
    'cillum',
    'commodo',
    'consectetur',
    'consequat',
    'culpa',
    'cupidatat',
    'deserunt',
    'do',
    'dolor',
    'dolore',
    'duis',
    'ea',
    'eiusmod',
    'elit',
    'enim',
    'esse',
    'est',
    'et',
    'eu',
    'ex',
    'excepteur',
    'exercitation',
    'fugiat',
    'id',
    'in',
    'incididunt',
    'ipsum',
    'irure',
    'labore',
    'laboris',
    'laborum',
    'Lorem',
    'magna',
    'minim',
    'mollit',
    'nisi',
    'non',
    'nostrud',
    'nulla',
    'occaecat',
    'officia',
    'pariatur',
    'proident',
    'qui',
    'quis',
    'reprehenderit',
    'sint',
    'sit',
    'sunt',
    'tempor',
    'ullamco',
    'ut',
    'velit',
    'veniam',
    'voluptate',
  ],
};
