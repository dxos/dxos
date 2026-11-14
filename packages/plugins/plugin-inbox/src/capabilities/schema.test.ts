//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { Person } from '@dxos/types';

import types from './schema.ts';

// An EDGE bundle registers only the types its plugins contribute, so this list is the whole registry the
// mail sync commits into there (`plugin-host-cloudflare` `PluginActivation.registeredTypes`).
describe('inbox schema', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('registers the Person the mail sync commits for a new sender', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [...types] });
    // `EmailStage.toCommitUnit` adds the contact `EmailStage.extractContacts` built from the sender.
    const contact = Person.make({ emails: [{ value: 'sender@example.com' }] });
    expect(() => db.add(contact)).not.toThrow();
  });
});
