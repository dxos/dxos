//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Obj, Ref } from '@dxos/echo';
import { Script } from '@dxos/functions';
import { Operation } from '@dxos/operation';
import { CollectionModel } from '@dxos/schema';

import { Create } from './definitions';

export default Create.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ name, source, templateId }) {
      let scriptSource = source ?? '';

      if (templateId) {
        const template = yield* findTemplate(templateId);
        if (template) {
          scriptSource = template.source;
        }
      }

      const script = Script.make({ name, source: scriptSource });
      const { db } = yield* Database.Service;
      db.add(script);

      const fn = Obj.make(Operation.PersistentOperation, {
        name,
        version: '0.0.0',
        source: Ref.make(script),
      });
      yield* CollectionModel.add({ object: fn });

      return {
        function: Obj.getDXN(fn).toString(),
      };
    }),
  ),
);

const findTemplate = (templateId: string) =>
  Effect.promise(async () => {
    const { templates } = await import('../../templates');
    return templates.find((template) => template.id === templateId);
  });
