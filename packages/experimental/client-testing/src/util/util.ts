//
// Copyright 2022 DXOS.org
//

import faker from 'faker';

export type NumberRange = [min: number, max: number] | number;

export const getNumber = (n: NumberRange) =>
  typeof n === 'number' ? n : faker.datatype.number({ min: n[0], max: n[1] });

export const array = (length: number) => Array.from(Array(length));

export const times = <T>(length: number, constructor: (i: number) => T) => array(length).map((_, i) => constructor(i));

export const enumFromString = <T>(type: { [s: string]: T }, value: string): T | undefined =>
  (Object.values(type) as unknown as string[]).includes(value) ? (value as unknown as T) : undefined;

export const capitalize = (text: string) => (text.length ? text.charAt(0).toUpperCase() + text.slice(1) : text);
