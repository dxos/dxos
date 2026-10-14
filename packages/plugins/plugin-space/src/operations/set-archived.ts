//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Annotation, Obj } from '@dxos/echo';
import { assertArgument } from '@dxos/invariant';
import { ArchivedAnnotation, isArchivable, isArchived } from '@dxos/schema';

import { SpaceOperation } from '#types';

const handler: Operation.WithHandler<typeof SpaceOperation.SetArchived> = SpaceOperation.SetArchived.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ objects, archived }) {
      for (const object of objects) {
        assertArgument(isArchivable(object), 'objects', `${Obj.getTypename(object)} is not archivable.`);
      }
      const changed = objects.filter((object) => isArchived(object) !== archived);
      for (const object of changed) {
        Obj.update(object, (object) => Annotation.set(object, ArchivedAnnotation, archived));
      }
      return { objects: changed };
    }),
  ),
);

export default handler;
