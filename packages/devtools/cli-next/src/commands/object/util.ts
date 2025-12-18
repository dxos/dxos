//
// Copyright 2025 DXOS.org
//

import { type Entity, Obj } from '@dxos/echo';

import { FormBuilder } from '../../util';

/**
 * Pretty prints an object with ANSI colors.
 */
export const printObject = (obj: Entity.Any) => {
  const typename = Obj.getTypename(obj) ?? '<unknown>';

  // TODO(wittjosiah): Obj.getSchema and thus Obj.getLabel are coming back undefined for some reason.
  return FormBuilder.of({ title: Obj.getLabel(obj) ?? typename })
    .set({ key: 'id', value: obj.id })
    .set({ key: 'typename', value: typename })
    .build();
};

/**
 * Pretty prints object stats with ANSI colors.
 */
export const printStats = (typename: string, count: number) =>
  FormBuilder.of({ title: typename }).set({ key: 'count', value: count }).build();

/**
 * Pretty prints object removal result with ANSI colors.
 */
export const printObjectRemoved = (count: number) =>
  FormBuilder.of({ title: 'Objects removed' }).set({ key: 'count', value: count }).build();
