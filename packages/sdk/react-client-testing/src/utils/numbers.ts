//
// Copyright 2022 DXOS.org
//

import faker from 'faker';

export type Num = [min: number, max: number] | number

export const num = (n: Num) => typeof n === 'number' ? n : faker.datatype.number({ min: n[0], max: n[1] });
