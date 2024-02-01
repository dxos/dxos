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

import { type Range, toRange, uniqueArray } from './util';

// Fake faker.
export const faker = {
  //
  // Util
  //
  seed: (value: number) => seed(String(value)),
  helpers: {
    multiple: (f: () => any, range: Range & { count: number }) =>
      Array.from({ length: range.count !== undefined ? range.count : randNumber(range) }).map(() => f()),
    arrayElement: <T>(a: T[]) => rand(a),
    uniqueArray: (f: any[] | (() => any), n: number) => uniqueArray(f, n),
  },
  //
  // Type
  //
  number: {
    int: (range?: number | Range) => randNumber(range ? toRange(range) : undefined),
    float: (range: number | Range) => randFloat(toRange(range)),
  },
  datatype: {
    array: (n: number) => Array.from({ length: n }),
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
    words: (n: number = 1) =>
      Array.from({ length: n })
        .map(() => randWord())
        .join(' '),
    sentence: (n?: number) => {
      if (n) {
        const text = randWord({ length: n }).join(' ');
        return text.charAt(0).toUpperCase() + text.slice(1) + '.';
      }

      return randSentence();
    },
    sentences: (n: number = 1) => randSentence({ length: n }).join(' '),
    paragraph: () => randParagraph(),
    paragraphs: (n: number = 1) => randParagraph({ length: n }).join(' '),
  },
  //
  // String
  //
  string: {
    hexadecimal: (l?: { length: number }) => randHexaDecimal(l),
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
