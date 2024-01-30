//
// Copyright 2023 DXOS.org
//

export type Range = number | { min: number; max: number };

export const WORDS = [
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
];

const commonPrefixes = [
  'un',
  'pre',
  'dis',
  're',
  'sub',
  'ex',
  'mis',
  'non',
  'tri',
  'pro',
  'con',
  'auto',
  'bi',
  'co',
  'de',
  'en',
  'in',
  'bi',
  'di',
  'un',
];

const commonSuffixes = [
  'ing',
  'er',
  'ed',
  'ly',
  'able',
  'less',
  'ful',
  'ness',
  'ment',
  'tion',
  'sion',
  'ity',
  'ive',
  'ive',
  'ous',
  'ic',
  'ity',
  'ant',
  'ate',
  'ize',
];

const generateRandomWord = () => {
  const randomPrefix = commonPrefixes[Math.floor(Math.random() * commonPrefixes.length)];
  const randomSuffix = commonSuffixes[Math.floor(Math.random() * commonSuffixes.length)];

  return randomPrefix + getRandomRoot() + randomSuffix;
};

const getRandomRoot = () => {
  const roots = ['ba', 'ka', 'ra'];

  return roots[Math.floor(Math.random() * roots.length)];
};

const randomWord = generateRandomWord();

const letterFrequencies = [
  // { letter: 'e', frequency: 12.7 },
  { letter: 't', frequency: 9.06 },
  // { letter: 'a', frequency: 8.17 },
  // { letter: 'o', frequency: 7.51 },
  // { letter: 'i', frequency: 6.97 },
  { letter: 'n', frequency: 6.75 },
  { letter: 's', frequency: 6.33 },
  { letter: 'h', frequency: 6.09 },
  { letter: 'r', frequency: 5.99 },
  { letter: 'd', frequency: 4.25 },
  { letter: 'l', frequency: 4.03 },
  { letter: 'c', frequency: 2.78 },
  // { letter: 'u', frequency: 2.76 },
  { letter: 'm', frequency: 2.41 },
  { letter: 'w', frequency: 2.36 },
  { letter: 'f', frequency: 2.23 },
  { letter: 'g', frequency: 2.02 },
  { letter: 'y', frequency: 1.97 },
  { letter: 'p', frequency: 1.93 },
  { letter: 'b', frequency: 1.49 },
  { letter: 'v', frequency: 0.98 },
  { letter: 'k', frequency: 0.77 },
  { letter: 'j', frequency: 0.15 },
  { letter: 'x', frequency: 0.15 },
  { letter: 'q', frequency: 0.1 },
  { letter: 'z', frequency: 0.07 },
];

const totalFrequency = letterFrequencies.reduce((acc, item) => acc + item.frequency, 0);

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
    const consonants = ['k', 's', 't', 'n', 'h', 'm', 'y', 'r', 'w'];
    const vowels = ['a', 'i', 'u', 'e', 'o'];

    const letter = () => {
      const randomValue = Math.random() * totalFrequency;
      let cumulativeFrequency = 0;
      for (const item of letterFrequencies) {
        cumulativeFrequency += item.frequency;
        if (randomValue <= cumulativeFrequency) {
          return item.letter;
        }
      }
    };

    // return generateRandomWord();

    return (
      Array.from({ length: this.number({ min: 1, max: 3 }) })
        .map(() => this.element(WORDS))
        // .map(() => letter() + this.element(vowels))
        // .map(() => this.element(consonants) + this.element(vowels))
        .join('')
    );
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
