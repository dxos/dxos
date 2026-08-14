//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Obj, Ref, Type } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { DXN, PublicKey } from '@dxos/keys';

/** Asserts where `Ref.byAnnotation` stops biting, so the limit fails loudly if resolution changes. */

const FeedAnnotationId = 'com.example.annotation.feed';

class Mailbox extends Type.makeObject<Mailbox>(DXN.make('com.example.type.mailbox', '0.1.0'))(
  Schema.Struct({ name: Schema.optional(Schema.String) }).pipe(
    Schema.annotate({ [FeedAnnotationId]: { property: 'feed' } }),
  ),
) {}

class Contact extends Type.makeObject<Contact>(DXN.make('com.example.type.contact', '0.1.0'))(
  Schema.Struct({ name: Schema.optional(Schema.String) }),
) {}

/** Mirrors an operation input boundary, which validates the type side synchronously. */
const validate = Schema.decodeUnknownSync(Schema.toType(Schema.Struct({ owner: Ref.byAnnotation(FeedAnnotationId) })));

describe('Ref.byAnnotation against a database', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('fires for a resolved target, passes for an unresolved one', async () => {
    const [spaceKey] = PublicKey.randomSequence();
    await using peer = await builder.createPeer();
    await using db = await peer.createDatabase(spaceKey);
    db.graph.registry.add([Mailbox, Contact]);

    const mailbox = db.add(Obj.make(Mailbox, { name: 'inbox' }));
    const contact = db.add(Obj.make(Contact, { name: 'Alice' }));
    await db.flush();
    const contactUri = Obj.getURI(contact);

    // Resident target: both directions are enforced.
    expect(() => validate({ owner: db.makeRef(Obj.getURI(mailbox)) })).not.toThrow();
    expect(() => validate({ owner: db.makeRef(contactUri) })).toThrow(FeedAnnotationId);

    await peer.reload();
    await using reopened = await peer.openDatabase(spaceKey);
    reopened.graph.registry.add([Mailbox, Contact]);

    // Accepted because a synchronous check cannot see a target that is on disk but not resident.
    expect(() => validate({ owner: reopened.makeRef(contactUri) })).not.toThrow();

    // The same reference is rejected once the handler has loaded the target.
    const ref = reopened.makeRef(contactUri);
    await ref.load();
    expect(() => validate({ owner: ref })).toThrow(FeedAnnotationId);
  });
});
