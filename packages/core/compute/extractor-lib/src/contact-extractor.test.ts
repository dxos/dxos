//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Obj } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { Message, Organization, Person } from '@dxos/types';

import { extractContact } from './contact-extractor.ts';

describe('extractContact', () => {
  let builder: EchoTestBuilder;
  let db: EchoDatabase;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
    ({ db } = await builder.createDatabase({
      types: [Message.Message, Organization.Organization, Person.Person],
    }));
  });

  afterEach(async () => {
    await builder.close();
  });

  const messageFrom = (email: string, name?: string, properties?: Record<string, unknown>) =>
    Message.make({
      created: '2026-08-12T00:00:00.000Z',
      sender: name ? { email, name } : { email },
      blocks: [{ _tag: 'text', text: 'Body' }],
      properties: { subject: 'Subject', ...properties },
    });

  const run = (message: Message.Message) => EffectEx.runPromise(extractContact({ db, source: message }));

  /**
   * The regression this guards: run over a real mailbox, the ungated extractor produced 101 Person
   * objects — `no-reply@`, `mailer-daemon@`, `invoice+statements+acct_…@stripe.com` and friends.
   */
  test('creates nothing for a machine sender', async ({ expect }) => {
    for (const email of [
      'no-reply@grafana.com',
      'noreply@safesendreturns.com',
      'mailer-daemon@googlemail.com',
      'invoice+statements+acct_1ika5ja3kz32dpo1@stripe.com',
      'support@digitalocean.com',
    ]) {
      const result = await run(messageFrom(email));
      expect(result.created, email).toEqual([]);
    }
  });

  test('creates nothing when the headers say bulk, whoever the sender is', async ({ expect }) => {
    const unsubscribe = await run(messageFrom('alice@dxos.org', 'Alice', { listUnsubscribe: '<https://dxos.org/u>' }));
    expect(unsubscribe.created).toEqual([]);
    const noReply = await run(messageFrom('alice@dxos.org', 'Alice', { noReply: true }));
    expect(noReply.created).toEqual([]);
  });

  test('still creates a Person (and their Organization) for an individual', async ({ expect }) => {
    const result = await run(messageFrom('chad@blueyard.com', 'Chad Fowler'));
    const contacts = result.created.filter((object) => Obj.instanceOf(Person.Person, object));
    expect(contacts.map((contact) => contact.emails?.[0]?.value)).toEqual(['chad@blueyard.com']);
    expect(contacts[0].fullName).toBe('Chad Fowler');
    // The corporate domain also mints its Organization, which is what the contact links to.
    expect(result.created.filter((object) => Obj.instanceOf(Organization.Organization, object))).toHaveLength(1);
  });

  test('creates nothing for a message with no sender', async ({ expect }) => {
    const message = Message.make({
      created: '2026-08-12T00:00:00.000Z',
      sender: {},
      blocks: [{ _tag: 'text', text: 'Body' }],
    });
    expect((await run(message)).created).toEqual([]);
  });
});
