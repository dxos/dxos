//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import * as Project from '@dxos/compute/Project';
import * as Spec from '@dxos/compute/Spec';
import { parseCitation } from '@dxos/deus/schema';
import { Database, Filter, Ref } from '@dxos/echo';

import { CodeOperation, FeatureMap } from '#types';

import { addSpec, readItem, setItemField } from './util.ts';

const handler: Operation.WithHandler<typeof CodeOperation.CreateSpec> = CodeOperation.CreateSpec.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ name, description, dialects, project, breaks }) {
      if (!breaks) {
        const spec = yield* addSpec({ name, description, dialects, project });
        yield* Database.flush();
        return { spec };
      }

      const parent = yield* Database.load(breaks.spec);
      const text = yield* Database.load(parent.content);
      const cited = readItem(parent, text, breaks.item)?.value.fields.spec;
      if (typeof cited === 'string') {
        const [existing] = yield* Database.query(Filter.id(parseCitation(cited).spec)).run;
        if (Spec.instanceOf(existing)) {
          return { spec: existing };
        }
      }
      const owner = Project.getOwner(parent);
      const spec = yield* addSpec({
        name,
        description,
        dialects: dialects ?? [FeatureMap.SOFTWARE_DIALECT],
        project: project ?? (owner && Ref.make(owner)),
      });
      yield* setItemField(parent, text, breaks.item, 'spec', `echo:///${spec.id}`);
      yield* Database.flush();
      return { spec };
    }),
  ),
);

export default handler;
