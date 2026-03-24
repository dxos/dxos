//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Obj } from '@dxos/echo';
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

      const object = Script.make({ name, source: scriptSource });
      yield* CollectionModel.add({ object });

      return {
        id: Obj.getDXN(object).toString(),
      };
    }),
  ),
);

const findTemplate = (templateId: string) =>
  Effect.promise(async () => {
    const { templates } = await import('../../templates');
    return templates.find((template) => template.id === templateId);
  });
