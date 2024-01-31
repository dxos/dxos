//
// Copyright 2024 DXOS.org
//

import { faker as realFaker } from '@faker-js/faker';

import { type Range } from './util';

// TODO(burdon): Migration steps:
//  - Identify and remove test dependencies on specific values.
//  - Remove "custom" utils (e.g., animals).
//  - Replace utils/helpers.
//  - Replace data types.
//  - Replace lorem.

// Fake faker.
export const faker = {
  //
  // Util
  //
  seed: (seed: number) => realFaker.seed(seed),
  helpers: {
    multiple: (f: () => any, range?: { count: number | Range }) => realFaker.helpers.multiple(f, range),
    arrayElement: <T>(a: T[]) => realFaker.helpers.arrayElement(a),
    arrayElements: <T>(a: T[], n: number) => realFaker.helpers.arrayElements(a, n),
    uniqueArray: (f: readonly any[] | (() => any), n: number) => realFaker.helpers.uniqueArray(f, n),
  },
  //
  // Data
  //
  datatype: {
    array: (n: number) => realFaker.datatype.array(n),
    float: () => realFaker.datatype.float(),
    boolean: (p?: { probability: number }) => realFaker.datatype.boolean(p),
  },
  date: {
    recent: () => realFaker.date.recent(),
  },
  number: {
    int: (range?: number | Range) => realFaker.number.int(range),
  },
  string: {
    hexadecimal: (l?: { length: number }) => realFaker.string.hexadecimal(l),
    uuid: () => realFaker.string.uuid(),
  },
  //
  // Text
  //
  lorem: {
    lines: (n: number | Range) => realFaker.lorem.lines(n),
    word: (n?: number) => realFaker.lorem.word(n),
    words: (n?: number | Range) => realFaker.lorem.words(n),
    sentence: (n?: number | Range) => realFaker.lorem.sentence(n),
    sentences: (n?: number | Range) => realFaker.lorem.sentences(n),
    paragraph: (n?: number | Range) => realFaker.lorem.paragraph(n),
    paragraphs: (n?: number | Range) => realFaker.lorem.paragraphs(n),
  },
  //
  // Custom
  //
  internet: {
    email: () => realFaker.internet.email(),
    url: () => realFaker.internet.url(),
  },
  company: {
    name: () => realFaker.company.name(),
  },
  person: {
    fullName: () => realFaker.person.fullName(),
    firstName: () => realFaker.person.firstName(),
  },
  commerce: {
    productName: () => realFaker.commerce.productName(),
  },
};
