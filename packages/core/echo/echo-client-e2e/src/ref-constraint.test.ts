//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Obj, Ref, Type } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { DXN, PublicKey } from '@dxos/keys';

/**
 * Pins the exact reach of `Ref.byAnnotation` against a real database: the check is synchronous, so
 * it fires only for a target already in the working set. Asserted rather than documented, because
 * the gap is the feature's main limitation and must fail loudly if the resolution path changes.
 */

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

    // Working set populated: both directions are enforced.
    expect(() => validate({ owner: db.makeRef(Obj.getURI(mailbox)) })).not.toThrow();
    expect(() => validate({ owner: db.makeRef(contactUri) })).toThrow(FeedAnnotationId);

    await peer.reload();
    await using reopened = await peer.openDatabase(spaceKey);
    reopened.graph.registry.add([Mailbox, Contact]);

    // Cold context: the target is on disk but not in the working set, so a synchronous check cannot
    // see it and the reference is accepted. This is the documented best-effort limit.
    expect(() => validate({ owner: reopened.makeRef(contactUri) })).not.toThrow();

    // Once the handler loads the target, the same reference is rejected.
    const ref = reopened.makeRef(contactUri);
    await ref.load();
    expect(() => validate({ owner: ref })).toThrow(FeedAnnotationId);
  });
});
