//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation, type Script } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';
import { Doc, applyEdits } from '@dxos/echo-doc';

import { Update } from './definitions';

export default Update.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ function: fn, name, description, edits }) {
      const loaded = yield* Database.load(fn);
      if (!loaded.source) {
        return yield* Effect.fail(new Error('Function has no source script.'));
      }

      const script = (yield* Database.load(loaded.source)) as Script.Script;
      if (name !== undefined || description !== undefined) {
        Obj.update(script, (script) => {
          if (name !== undefined) {
            script.name = name;
          }
          if (description !== undefined) {
            script.description = description;
          }
        });
      }

      if (edits && edits.length > 0) {
        const text = yield* Database.load(script.source);
        const accessor = Doc.createAccessor(text, ['content']);
        applyEdits(accessor, edits);

        Obj.update(script, (script) => {
          script.changed = true;
        });
      }

      return {
        function: Obj.getURI(loaded),
      };
    }),
  ),
);
