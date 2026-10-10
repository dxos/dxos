//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Feed, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';

import * as Message from './Message.ts';
import * as Organization from './Organization.ts';

describe('Message', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('encodeJson() qualifies refs to stored objects with their space', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [Feed.Feed, Message.Message, Organization.Organization] });
    const organization = db.add(Organization.make({ name: 'DXOS' }));
    const message = Message.make({
      sender: { name: 'Alice' },
      attachments: [{ name: 'DXOS', ref: Ref.make(organization) }],
    });

    const decoded = Option.getOrThrow(Message.decodeJson(Message.encodeJson(message)));
    expect(decoded.attachments?.[0]?.ref.uri).toEqual(Obj.getURI(organization, { prefer: 'absolute' }));
    expect(decoded.attachments?.[0]?.ref.uri).toContain(db.spaceId);
  });
});
