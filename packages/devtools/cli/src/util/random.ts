//
// Copyright 2023 DXOS.org
//

export type Range = { min?: number; max?: number };

/**
 * Simple random generator that avoids dependency on faker.
 */
export class Random {
  element(values: any[]) {
    return values[Math.floor(Math.random() * values.length)];
  }

  number(range: Range = { min: 0, max: 10 }) {
    return (range.min ?? 0) + Math.floor(Math.random() * ((range.max ?? 10) - (range.min ?? 0)));
  }

  word() {
    const consonants = ['k', 's', 't', 'n', 'h', 'm', 'y', 'r', 'w'];
    const vowels = ['a', 'i', 'u', 'e', 'o'];
    return Array.from({ length: this.number({ min: 1, max: 8 }) })
      .map(() => this.element(consonants) + this.element(vowels))
      .join('');
  }
}
