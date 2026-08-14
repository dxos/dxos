//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { DXN, EID, EntityId } from '@dxos/keys';

import * as JsonSchema from './JsonSchema';
import * as Obj from './Obj';
import * as Ref from './Ref';
import * as Type from './Type';

/** Stand-in for `FeedAnnotationId` — the marker a generic operation wants to reference by. */
const FeedAnnotationId = 'com.example.annotation.feed';

class Feed extends Type.makeObject<Feed>(DXN.make('com.example.type.feed', '0.1.0'))(
  Schema.Struct({ name: Schema.optional(Schema.String) }),
) {}

/** Carries the marker. */
class Mailbox extends Type.makeObject<Mailbox>(DXN.make('com.example.type.mailbox', '0.1.0'))(
  Schema.Struct({ feed: Ref.Ref(Feed) }).pipe(Schema.annotate({ [FeedAnnotationId]: { property: 'feed' } })),
) {}

/** Also carries the marker, via a different property, to prove the constraint is not per-type. */
class Calendar extends Type.makeObject<Calendar>(DXN.make('com.example.type.calendar', '0.1.0'))(
  Schema.Struct({ events: Ref.Ref(Feed) }).pipe(Schema.annotate({ [FeedAnnotationId]: { property: 'events' } })),
) {}

/** Does not carry the marker. */
class Contact extends Type.makeObject<Contact>(DXN.make('com.example.type.contact', '0.1.0'))(
  Schema.Struct({ name: Schema.String }),
) {}

const OperationInput = Schema.Struct({
  owner: Ref.byAnnotation(FeedAnnotationId),
});

/** Mirrors the operation input boundary, which validates the type side synchronously. */
const validate = Schema.decodeUnknownSync(Schema.toType(OperationInput));

describe('Ref.byAnnotation', () => {
  test('accepts a ref to an annotated type', ({ expect }) => {
    const mailbox = Obj.make(Mailbox, { feed: Ref.make(Obj.make(Feed, {})) });
    expect(() => validate({ owner: Ref.make(mailbox) })).not.toThrow();
  });

  test('accepts refs to any annotated type, not one specific type', ({ expect }) => {
    const calendar = Obj.make(Calendar, { events: Ref.make(Obj.make(Feed, {})) });
    expect(() => validate({ owner: Ref.make(calendar) })).not.toThrow();
  });

  test('rejects a ref to an unannotated type, naming the missing annotation', ({ expect }) => {
    const contact = Obj.make(Contact, { name: 'Alice' });
    expect(() => validate({ owner: Ref.make(contact) })).toThrow(FeedAnnotationId);
  });

  test('rejects a value that is not a ref', ({ expect }) => {
    expect(() => validate({ owner: { name: 'not a ref' } })).toThrow();
  });

  test('accepts a ref whose target is not loaded', ({ expect }) => {
    // Validation is synchronous, so an unresolved target cannot be proven to violate the
    // constraint; the handler re-checks after loading. See `Ref.byAnnotation`.
    const ref = Ref.fromURI(EID.make({ entityId: EntityId.random() }));
    expect(() => validate({ owner: ref })).not.toThrow();
  });

  test('is a reference schema targeting any object', ({ expect }) => {
    const schema = Ref.byAnnotation(FeedAnnotationId);
    expect(Ref.isRefType(schema.ast)).toBe(true);
    expect(Ref.getReferenceTarget(schema.ast)).toEqual(DXN.make('org.dxos.schema.anyObject', '0.0.0'));
  });

  test('the constraint survives a JSON schema round trip', ({ expect }) => {
    const json = JsonSchema.toJsonSchema(OperationInput);
    const restored = JsonSchema.toEffectSchema(json);
    const validateRestored = Schema.decodeUnknownSync(Schema.toType(restored));

    const mailbox = Obj.make(Mailbox, { feed: Ref.make(Obj.make(Feed, {})) });
    expect(() => validateRestored({ owner: Ref.make(mailbox) })).not.toThrow();

    const contact = Obj.make(Contact, { name: 'Alice' });
    expect(() => validateRestored({ owner: Ref.make(contact) })).toThrow(FeedAnnotationId);
  });
});
