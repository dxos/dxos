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

import { type Range, toRange } from './util';

const uniqueArray = <T>(values: T[] | (() => T), n: number): T[] => {
  if (Array.isArray(values)) {
    const results: T[] = [];
    const selection = Array.from(new Set<T>(values));
    for (let i = 0; i < n; i++) {
      if (selection.length === 0) {
        break;
      }
      results.push(selection.splice(Math.floor(Math.random() * selection.length), 1)[0]);
    }
    return results;
  } else {
    const results = new Set<T>();
    while (results.size < n) {
      results.add(values());
    }

    return Array.from(results);
  }
};

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
    int: (range: number | Range) => randNumber(toRange(range)),
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
    sentence: () => randSentence(),
    sentences: (n: number = 1) =>
      Array.from({ length: n })
        .map(() => randSentence())
        .join(' '),
    paragraph: () => randParagraph(),
    paragraphs: (n: number = 1) =>
      Array.from({ length: n })
        .map(() => randParagraph())
        .join(' '),
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
