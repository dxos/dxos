//
// Copyright 2024 DXOS.org
//

import { faker as realFaker } from '@faker-js/faker';

import { type Range } from './random';

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
    fake: realFaker.helpers.fake, // TODO(burdon): ???
    arrayElement: <T>(a: T[]) => realFaker.helpers.arrayElement(a),
    multiple: (f: () => any, range?: { count: Range }) => realFaker.helpers.multiple(f, range),
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
    int: (range?: Range) => realFaker.number.int(range),
  },
  string: {
    hexadecimal: (l?: { length: number }) => realFaker.string.hexadecimal(l),
    uuid: () => realFaker.string.uuid(),
  },
  //
  // Text
  //
  lorem: {
    lines: (n: Range) => realFaker.lorem.lines(n),
    word: (n?: number) => realFaker.lorem.word(n),
    words: (n?: Range) => realFaker.lorem.words(n),
    sentence: (n?: Range) => realFaker.lorem.sentence(n),
    sentences: (n?: Range) => realFaker.lorem.sentences(n),
    paragraph: (n?: Range) => realFaker.lorem.paragraph(n),
    paragraphs: (n?: Range) => realFaker.lorem.paragraphs(n),
  },
  //
  // Custom
  //
  company: {
    name: () => realFaker.company.name(),
  },
  person: {
    fullName: () => realFaker.person.fullName(),
    firstName: () => realFaker.person.firstName(),
  },
  commerce: {
    product: () => realFaker.commerce.product(),
    productName: () => realFaker.commerce.productName(),
  },
  internet: {
    email: () => realFaker.internet.email(),
    url: () => realFaker.internet.url(),
  },
  definitions: {
    animal: {
      fish: realFaker.definitions.animal.fish,
    },
  },
  animal: {
    bear: () => realFaker.animal.bear(),
    bird: () => realFaker.animal.bird(),
    cat: () => realFaker.animal.cat(),
    lion: () => realFaker.animal.lion(),
  },
};
