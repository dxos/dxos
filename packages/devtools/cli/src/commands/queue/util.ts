//
// Copyright 2025 DXOS.org
//

import { type Entity, Obj } from '@dxos/echo';

import { FormBuilder } from '../../util';

/**
 * Pretty prints a queue object with ANSI colors.
 */
export const printQueueObject = (obj: Entity.Any) => {
  const typename = Obj.getTypename(obj) ?? '<unknown>';

  return FormBuilder.make({ title: typename }).pipe(
    FormBuilder.set('id', obj.id),
    FormBuilder.set('typename', typename),
    FormBuilder.build
  );
};
