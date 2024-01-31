//
// Copyright 2023 DXOS.org
//

import { core, type Range } from './core';
import { type } from './type';

export const text = {
  word: () => {
    return core.element(data.words);
  },

  sentence: (range: Range = { min: 8, max: 16 }) => {
    const sentence = core.multiple(type.number(range), text.word).join(' ');
    return sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.';
  },

  paragraph: (range: Range = { min: 3, max: 8 }) => {
    return core.multiple(type.number(range), text.sentence).join(' ');
  },
};

// TODO(burdon): Languages.
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
