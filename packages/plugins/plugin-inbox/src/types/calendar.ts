//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { Obj, Type } from '@dxos/echo';

export const Calendar = Schema.Struct({}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Calendar',
    version: '0.1.0',
  }),
);
export type Calendar = Schema.Schema.Type<typeof Calendar>;

/**
 * Make a calendar object.
 */
export const make = (props: Obj.MakeProps<typeof Calendar> = {}) => Obj.make(Calendar, props);
