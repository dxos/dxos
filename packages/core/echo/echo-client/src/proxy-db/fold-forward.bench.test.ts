//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { DXN, Migration, Obj, Type } from '@dxos/echo';

import { EchoTestBuilder, getObjectCore } from '../testing/index.ts';

// Measures fold-forward cost; opt-in because timings are environment-dependent and slow to gather.
const ENABLED = process.env.DX_BENCH === '1';

class ContactV1 extends Type.makeObject<ContactV1>(DXN.make('org.dxos.test.foldBench.Contact', '0.1.0'))(
  Schema.Struct({ fullName: Schema.String, note: Schema.optional(Schema.String) }),
) {}

class ContactV2 extends Type.makeObject<ContactV2>(DXN.make('org.dxos.test.foldBench.Contact', '0.2.0'))(
  Schema.Struct({ name: Schema.String, note: Schema.optional(Schema.String) }),
) {}

const migration = Migration.define({
  from: ContactV1,
  to: ContactV2,
  transform: (from) => ({ name: from.fullName, note: from.note }),
});

const time = async (run: () => Promise<void>): Promise<number> => {
  const start = performance.now();
  await run();
  return performance.now() - start;
};

describe.skipIf(!ENABLED)('fold-forward cost', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  for (const count of [50, 200]) {
    test(`${count} migrated objects with 20 edits of history each`, { timeout: 600_000 }, async () => {
      const { db, graph } = await builder.createDatabase();
      graph.registry.add([ContactV1, ContactV2]);

      const contacts = Array.from({ length: count }, (_, index) =>
        db.add(Obj.make(ContactV1, { fullName: `Contact ${index}` })),
      );
      await db.flush();
      for (let edit = 0; edit < 20; edit++) {
        for (const contact of contacts) {
          Obj.update(contact, (contact) => {
            contact.note = `edit ${edit}`;
          });
        }
      }
      await db.flush();

      const migrate = await time(() => db.runMigrations([migration]));
      const idlePass = await time(() => db.foldForward([migration]));
      const scopedPass = await time(() => db.foldForward([migration], { objectIds: new Set([contacts[0].id]) }));

      const lateCount = Math.max(1, Math.floor(count / 10));
      for (const contact of contacts.slice(0, lateCount)) {
        getObjectCore(contact).setDecoded(['data', 'fullName'], `${Obj.getValue(contact, ['name'])} (late)`);
      }
      await db.flush();
      const latePass = await time(() => db.foldForward([migration]));

      // oxlint-disable-next-line no-console
      console.log(
        JSON.stringify({
          objects: count,
          migrateMs: Math.round(migrate),
          idleFullPassMs: Math.round(idlePass),
          idlePerObjectMs: +(idlePass / count).toFixed(2),
          scopedOneObjectMs: Math.round(scopedPass),
          lateWrites: lateCount,
          latePassMs: Math.round(latePass),
        }),
      );
      expect(Obj.getValue(contacts[0], ['name'])).to.eq('Contact 0 (late)');
    });
  }
});
