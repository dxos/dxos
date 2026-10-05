//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { DXN } from '@dxos/keys';

import * as Entity from './Entity.ts';
import * as Error from './Error.ts';
import * as Event from './Event.ts';
import * as Feed from './Feed.ts';
import * as Obj from './Obj.ts';
import * as Query from './Query.ts';
import * as Ref from './Ref.ts';
import * as Relation from './Relation.ts';
import { TestSchema } from './testing/index.ts';
import * as Type from './Type.ts';

class Viewed extends Type.makeEvent<Viewed>(DXN.make('com.example.type.viewed', '0.1.0'))(
  Schema.Struct({
    by: Schema.String,
    subject: Ref.Ref(TestSchema.Person).pipe(Schema.optional),
  }),
) {}

describe('Event', () => {
  describe('type', () => {
    test('makeEvent produces an event-kind type', ({ expect }) => {
      expect(Type.isEvent(Viewed)).toBe(true);
      expect(Type.isObject(Viewed)).toBe(false);
      expect(Type.isRelation(Viewed)).toBe(false);
      expect(Type.getTypename(Viewed)).toEqual('com.example.type.viewed');
      expect(Type.expectEvent(Viewed)).toBe(Viewed);
      expect(() => Type.expectEvent(TestSchema.Person)).toThrow();
    });

    test('json schema records the event kind', ({ expect }) => {
      expect(Viewed.jsonSchema.entityKind).toEqual(Entity.Kind.Event);
    });
  });

  describe('make', () => {
    test('creates an event with an id and a timestamp', ({ expect }) => {
      const before = Date.now();
      const event = Event.make(Viewed, { by: 'alice' });
      expect(event.by).toEqual('alice');
      expect(Event.isEvent(event)).toBe(true);
      expect(event[Entity.KindId]).toEqual(Entity.Kind.Event);
      expect(Obj.isObject(event)).toBe(false);
      expect(Relation.isRelation(event)).toBe(false);
      expect(Event.instanceOf(Viewed, event)).toBe(true);
      expect(Event.getTypename(event)).toEqual('com.example.type.viewed');
      expect(Event.getType(event)).toBe(Viewed);
      expect(Event.getTimestamp(event)).toBeGreaterThanOrEqual(before);
      expect(Event.getObjectURI(event)).toBeUndefined();
    });

    test('rejects invalid props', ({ expect }) => {
      // @ts-expect-error Wrong property type.
      expect(() => Event.make(Viewed, { by: 42 })).toThrow();
    });

    test('rejects object types', ({ expect }) => {
      // @ts-expect-error Object types are not event types.
      expect(() => Event.make(TestSchema.Person, { name: 'alice' })).toThrow();
      // @ts-expect-error Event types are not object types.
      expect(() => Obj.make(Viewed, { by: 'alice' })).toThrow();
    });

    test('rejects a parent', ({ expect }) => {
      const parent = Obj.make(TestSchema.Person, { name: 'alice' });
      // @ts-expect-error Events have no parent.
      expect(() => Event.make(Viewed, { by: 'alice', [Obj.Parent]: parent })).toThrow(Error.EventNotSupportedError);
    });
  });

  describe('immutability', () => {
    test('updates throw', ({ expect }) => {
      const event = Event.make(Viewed, { by: 'alice' });
      expect(() =>
        Entity.update(event, (event) => {
          (event as { by: string }).by = 'bob';
        }),
      ).toThrow(Error.EventNotSupportedError);
      expect(() =>
        // @ts-expect-error Events are not objects.
        Obj.update(event, (event) => event),
      ).toThrow(Error.EventNotSupportedError);
      expect(() => {
        (event as { by: string }).by = 'bob';
      }).toThrow();
      expect(event.by).toEqual('alice');
    });
  });

  describe('parent', () => {
    test('events cannot be children or parents', ({ expect }) => {
      const event = Event.make(Viewed, { by: 'alice' });
      const obj = Obj.make(TestSchema.Person, { name: 'alice' });
      // @ts-expect-error Events are not objects.
      expect(() => Obj.setParent(event, obj)).toThrow(Error.EventNotSupportedError);
      // @ts-expect-error Events are not objects.
      expect(() => Obj.setParent(obj, event)).toThrow(Error.EventNotSupportedError);
      // @ts-expect-error Events are not objects.
      expect(() => Obj.getParent(event)).toThrow(Error.EventNotSupportedError);
    });
  });

  describe('refs', () => {
    test('events cannot be referenced', ({ expect }) => {
      const event = Event.make(Viewed, { by: 'alice' });
      expect(() => Ref.make(event)).toThrow(Error.EventNotSupportedError);
      // @ts-expect-error Events cannot be reference targets.
      expect(() => Ref.Ref(Viewed)).toThrow(Error.EventNotSupportedError);
    });

    test('events can hold refs and round-trip through JSON', async ({ expect }) => {
      const person = Obj.make(TestSchema.Person, { name: 'alice' });
      const event = Event.make(Viewed, { by: 'bob', subject: Ref.make(person) });
      const json = Event.toJSON(event);
      expect(json['@kind']).toEqual(Entity.Kind.Event);
      expect(json['@timestamp']).toEqual(Event.getTimestamp(event));

      const decoded = await Event.fromJSON(json);
      expect(Event.isEvent(decoded)).toBe(true);
      expect(Event.getTimestamp(decoded)).toEqual(Event.getTimestamp(event));
      expect((decoded as Viewed).subject?.uri).toEqual(event.subject?.uri);
    });
  });

  describe('relations', () => {
    test('event types cannot be relation endpoints', ({ expect }) => {
      expect(() =>
        Type.makeRelation(DXN.make('com.example.type.viewedBy', '0.1.0'))({
          // @ts-expect-error Events cannot be relation endpoints.
          source: Viewed,
          target: TestSchema.Person,
        })(Schema.Struct({})),
      ).toThrow();
    });

    test('event instances cannot be relation endpoints', ({ expect }) => {
      const event = Event.make(Viewed, { by: 'alice' });
      const person = Obj.make(TestSchema.Person, { name: 'bob' });
      expect(() =>
        Relation.make(TestSchema.HasManager, {
          // @ts-expect-error Events cannot be relation endpoints.
          [Relation.Source]: event,
          [Relation.Target]: person,
        }),
      ).toThrow(Error.EventNotSupportedError);
    });
  });

  describe('appendEvents', () => {
    test('throws for objects outside a database, relations and feeds', ({ expect }) => {
      const event = Event.make(Viewed, { by: 'alice' });
      const person = Obj.make(TestSchema.Person, { name: 'alice' });
      expect(() => Obj.appendEvents(person, [event])).toThrow(Error.EventsNotSupportedError);
      expect(() => Obj.appendEvents(Feed.make({ name: 'feed' }), [event])).toThrow(Error.EventsNotSupportedError);

      const relation = Relation.make(TestSchema.HasManager, {
        [Relation.Source]: person,
        [Relation.Target]: Obj.make(TestSchema.Person, { name: 'bob' }),
      });
      // @ts-expect-error Relations have no event feed.
      expect(() => Obj.appendEvents(relation, [event])).toThrow(Error.EventsNotSupportedError);
    });
  });

  describe('query', () => {
    test('Query.events builds an event traversal from the object', ({ expect }) => {
      const person = Obj.make(TestSchema.Person, { name: 'alice' });
      const query = Query.events(person, Viewed);
      expect(query.ast.type).toEqual('filter');
      expect(query.ast.type === 'filter' && query.ast.selection.type).toEqual('event-traversal');
      expect(Query.pretty(query)).toContain('.events()');

      const all = Query.events(person);
      expect(all.ast.type).toEqual('event-traversal');
    });

    test('events() traverses from a selection', ({ expect }) => {
      const query = Query.type(TestSchema.Person).events(Viewed);
      expect(query.ast.type === 'filter' && query.ast.selection.type).toEqual('event-traversal');
    });

    test('events() is only available on object queries', ({ expect }) => {
      // @ts-expect-error Relations have no events.
      const query = Query.type(TestSchema.HasManager).events();
      expect(query).toBeDefined();
    });
  });
});
