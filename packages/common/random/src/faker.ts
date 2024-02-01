//
// Copyright 2024 DXOS.org
//

import {
  rand,
  randChanceBoolean,
  randCompanyName,
  randEmail,
  randFirstName,
  randFloat,
  randFullName,
  randHexaDecimal,
  randNumber,
  randParagraph,
  randProductName,
  randRecentDate,
  randSentence,
  randUrl,
  randUuid,
  randWord,
  seed,
} from '@ngneat/falso';

import { getCount, multiple, type Range, toRange, uniqueArray } from './util';

// Fake faker.
export const faker = {
  //
  // Util
  //
  seed: (value: number) => seed(String(value)),
  helpers: {
    multiple: (f: () => any, { count }: { count: number | { min: number; max: number } }) =>
      multiple(f, typeof count === 'number' ? count : getCount(count)),
    arrayElement: <T>(a: T[]) => rand(a),
    uniqueArray: (f: any[] | (() => any), n: number) => uniqueArray(f, n),
  },
  //
  // Type
  //
  number: {
    int: (range?: number | Range) => randNumber(range ? toRange(range) : undefined),
    float: (range?: number | Range) => randFloat(range ? toRange(range) : undefined),
  },
  datatype: {
    array: (n: number) => Array.from({ length: n }), // TODO(burdon): range().
    boolean: (p?: { probability: number }) => randChanceBoolean({ chanceTrue: p?.probability ?? 0.5 }),
  },
  date: {
    recent: () => randRecentDate(),
  },
  //
  // Text
  //
  lorem: {
    word: () => randWord(),
    words: (n: number | Range = 1) => randWord({ length: getCount(n) }).join(' '),
    sentence: (n: number | Range = 1) => {
      if (n) {
        const text = randWord({ length: getCount(n) }).join(' ');
        return text.charAt(0).toUpperCase() + text.slice(1) + '.';
      }

      return randSentence();
    },
    sentences: (n: number | Range = 1) => randSentence({ length: getCount(n) }).join(' '),
    paragraph: (n: number | Range = 1) => {
      if (n) {
        return randSentence({ length: getCount(n) }).join(' ');
      }

      return randParagraph();
    },
    paragraphs: (n: number | Range = 1) => randParagraph({ length: getCount(n) }).join(' '),
  },
  //
  // String
  //
  string: {
    hexadecimal: (l?: { length: number }) => randHexaDecimal(l).join(''),
    uuid: () => randUuid(),
  },
  //
  // Custom
  //
  internet: {
    email: () => randEmail(),
    url: () => randUrl(),
  },
  person: {
    fullName: () => randFullName(),
    firstName: () => randFirstName(),
  },
  company: {
    name: () => randCompanyName(),
  },
  commerce: {
    productName: () => randProductName(),
  },
};
