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

  return FormBuilder.of({ title: typename })
    .set({ key: 'id', value: obj.id })
    .set({ key: 'typename', value: typename })
    .build();
};
