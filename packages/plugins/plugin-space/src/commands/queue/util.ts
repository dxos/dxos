//
// Copyright 2025 DXOS.org
//

import { Doc, FormBuilder } from '@dxos/cli-util';
import { Entity } from '@dxos/echo';

/**
 * Pretty prints a queue object with ANSI colors.
 */
export const printQueueObject = (obj: Entity.Any): Doc.Doc<any> => {
  const typename = Entity.getTypename(obj) ?? '<unknown>';

  return FormBuilder.make({ title: typename }).pipe(
    FormBuilder.set('id', obj.id),
    FormBuilder.set('typename', typename),
    FormBuilder.build,
  );
};
