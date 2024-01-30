//
// Copyright 2024 DXOS.org
//

import { faker as realFaker } from '@faker-js/faker';

import { type Range } from './random';

// TODO(burdon): Fake faker.
export const faker = {
  seed: (seed: number) => realFaker.seed(seed),
  //
  // Helpers
  //
  helpers: {
    fake: realFaker.helpers.fake, // TODO(burdon): ???
    multiple: (f: () => any, range?: { count: Range }) => realFaker.helpers.multiple(f, range),
    arrayElement: <T>(a: T[]) => realFaker.helpers.arrayElement(a),
    arrayElements: <T>(a: T[], n: number) => realFaker.helpers.arrayElements(a, n),
    uniqueArray: (f: readonly any[] | (() => any), n: number) => realFaker.helpers.uniqueArray(f, n),
  },
  //
  // Data
  //
  datatype: {
    array: (n: number) => realFaker.datatype.array(),
    boolean: (p?: { probability: number }) => realFaker.datatype.boolean(p),
    float: () => realFaker.datatype.float(),
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
    cat: () => realFaker.animal.cat(),
    bird: () => realFaker.animal.bird(),
    lion: () => realFaker.animal.lion(),
  },
};
