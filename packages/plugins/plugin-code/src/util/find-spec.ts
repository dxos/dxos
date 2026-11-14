//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import * as Spec from '@dxos/compute/Spec';
import { parseCitation, parseDialectHeader } from '@dxos/deus/schema';
import { type Database, Filter, Obj } from '@dxos/echo';

/** The spec a `spec:` value names: an object id (`echo:///<id>`), else a front-matter spec id. */
export const findSpec = async (db: Database.Database, value: string): Promise<Spec.Spec | undefined> => {
  const name = parseCitation(value).spec;
  if (Schema.is(Obj.ID)(name)) {
    const [byId] = await db.query(Filter.id(name)).run();
    if (Spec.instanceOf(byId)) {
      return byId;
    }
  }
  for (const spec of await db.query(Filter.type(Spec.Spec)).run()) {
    const text = await spec.content.load();
    if (parseDialectHeader(text.content).id === name) {
      return spec;
    }
  }
  return undefined;
};
