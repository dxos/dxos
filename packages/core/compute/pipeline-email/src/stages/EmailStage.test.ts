//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Database, Obj } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import { Message, Organization, Person } from '@dxos/types';

import * as EmailStage from './EmailStage.ts';

describe('EmailStage.extractContacts', () => {
  let builder: EchoTestBuilder;
  let db: EchoDatabase;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
    ({ db } = await builder.createDatabase({ types: [Message.Message, Organization.Organization, Person.Person] }));
    // A known Organization is what admits a sender through the contact gate.
    db.add(Obj.make(Organization.Organization, { name: 'Corp', website: 'https://corp.com' }));
    await db.flush({ indexes: true });
  });

  afterEach(async () => {
    await builder.close();
  });

  const insert = (email: string, key: number): EmailStage.Change => ({
    _tag: 'insert',
    foreignId: `gmail-${key}`,
    key,
    message: Message.make({
      created: '2026-11-09T00:00:00.000Z',
      sender: { email },
      blocks: [{ _tag: 'text', text: 'Body' }],
      properties: { subject: 'Subject' },
    }),
  });

  const run = (changes: EmailStage.Change[]) =>
    EffectEx.runPromise(
      Stream.runCollect(EmailStage.extractContacts()(Stream.fromIterable(changes))).pipe(
        Effect.provide(Database.layer(db)),
      ),
    );

  test('a sender that cannot become a Person does not fail the run', async ({ expect }) => {
    // `Obj.make(Person)` rejects this address; it used to fail every sync run of the mailbox.
    const out = await run([insert('two words@corp.com', 1), insert('alice@corp.com', 2)]);
    expect(out.map((change) => change.foreignId)).toEqual(['gmail-1', 'gmail-2']);
    const [invalid, valid] = out;
    expect(invalid._tag === 'insert' && invalid.contact).toBeFalsy();
    expect(valid._tag === 'insert' && valid.contact?.emails?.[0]?.value).toBe('alice@corp.com');
  });

  test("builds a Person for a sender with an apostrophe (the canary mailbox's nicholas.o'day@enron.com)", async ({
    expect,
  }) => {
    const [change] = await run([insert("o'day@corp.com", 1)]);
    expect(change._tag === 'insert' && change.contact?.emails?.[0]?.value).toBe("o'day@corp.com");
  });
});
