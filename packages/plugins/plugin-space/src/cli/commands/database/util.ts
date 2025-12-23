//
// Copyright 2025 DXOS.org
//

import { type Entity, Obj } from '@dxos/echo';

import { FormBuilder } from '@dxos/cli-util';

/**
 * Pretty prints an object with ANSI colors.
 */
export const printObject = (obj: Entity.Unknown) => {
  const typename = Obj.getTypename(obj) ?? '<unknown>';

  // TODO(wittjosiah): Obj.getSchema and thus Obj.getLabel are coming back undefined for some reason.
  return FormBuilder.make({ title: Obj.getLabel(obj) ?? typename }).pipe(
    FormBuilder.set('id', obj.id),
    FormBuilder.set('typename', typename),
    FormBuilder.build,
  );
};

/**
 * Pretty prints object stats with ANSI colors.
 */
export const printStats = (typename: string, count: number) =>
  FormBuilder.make({ title: typename }).pipe(FormBuilder.set('count', count), FormBuilder.build);

/**
 * Pretty prints object removal result with ANSI colors.
 */
export const printObjectRemoved = (count: number) =>
  FormBuilder.make({ title: 'Objects removed' }).pipe(FormBuilder.set('count', count), FormBuilder.build);
