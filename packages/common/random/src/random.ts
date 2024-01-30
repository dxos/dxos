//
// Copyright 2023 DXOS.org
//

export type Range = number | { min: number; max: number };

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

/**
 * Simple random generator that avoids dependency on faker.
 */
export class Random {
  array(size: number) {
    return Array.from({ length: size });
  }

  element(values: any[]) {
    return values[Math.floor(Math.random() * values.length)];
  }

  number(range: Range = { min: 0, max: 10 }) {
    return typeof range === 'number'
      ? range
      : (range.min ?? 0) + Math.floor(Math.random() * ((range.max ?? 10) - (range.min ?? 0)));
  }

  word() {
    return this.element(data.words);
  }

  sentence(range: Range = { min: 8, max: 16 }) {
    return (
      this.word().charAt(0).toUpperCase() +
      this.array(this.number(range))
        .map(() => this.word())
        .join(' ') +
      '.'
    );
  }

  paragraph(range: Range = { min: 3, max: 8 }) {
    return this.array(this.number(range))
      .map(() => this.sentence())
      .join(' ');
  }
}
