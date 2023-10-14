//
// Copyright 2023 DXOS.org
//

import { faker } from '@faker-js/faker';

export const createSlide = (n?: number) => {
  const num = n === undefined ? '' : `${n}. `;
  return [`# ${num}${faker.lorem.sentence(3)}`, `${faker.lorem.sentences()}`].join('\n');
};

export const createSlides = (length = 1) => Array.from({ length }).map((_, i) => createSlide(i + 1));
