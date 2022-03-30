//
// Copyright 2022 DXOS.org
//

import faker from 'faker';

export type NumberRange = [min: number, max: number] | number

export const getNumber = (n: NumberRange) => typeof n === 'number' ? n : faker.datatype.number({ min: n[0], max: n[1] });
