//
// Copyright 2023 DXOS.org
//

import { faker } from '@dxos/random';

type SlideOptions = {
  number?: number;
  code?: boolean;
  list?: number;
  ordered?: number;
};

export const createSlide = (options: SlideOptions = {}) => {
  const num = options.number === undefined ? '' : `${options.number}. `;

  const code = () =>
    [
      '```tsx',
      'const x = [1, 2, 3];',
      'const f = (x: number[]) => x.reduce((acc, value) => acc + value, 0)',
      'const y = f(x)',
      '```',
    ].join('\n');

  const list = (length = 3) =>
    Array.from({ length })
      .map(() => `- ${faker.lorem.sentence(3)}`)
      .join('\n');

  const ordered = (length = 3) =>
    Array.from({ length })
      .map((_, i) => `${i + 1}. ${faker.lorem.sentence(3)}`)
      .join('\n');

  return [
    `# ${num}${faker.lorem.sentence(3)}`,
    faker.lorem.sentences(),
    options.code && code(),
    options.list && list(options.list),
    options.ordered && ordered(options.ordered),
    faker.lorem.sentences(),
  ]
    .filter(Boolean)
    .join('\n\r');
};

export const createSlides = (length = 1) => Array.from({ length }).map((_, i) => createSlide({ number: i + 1 }));
