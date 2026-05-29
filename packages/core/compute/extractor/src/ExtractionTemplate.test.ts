//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Operation } from '@dxos/compute';
import { DXN, Filter, Obj, Relation, Type } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-db';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { runAndForwardErrors } from '@dxos/effect';

import { dispatch } from './dispatch';
import { type ExtractionTemplate, makeTemplateExtractor } from './ExtractionTemplate';
import { fromExtractors } from './ExtractorRegistry';
import { getOrCreate } from './getOrCreate';
import { type ExtractResult } from './ObjectExtractor';
import { fromResolvers } from './Resolver';
import { mockAiService } from './testing/mock-ai';

//
// Test types.
//

const Note = Schema.Struct({ text: Schema.String }).pipe(Type.makeObject(DXN.make('com.example.type.Note', '0.1.0')));
interface Note extends Type.InstanceType<typeof Note> {}

const Contact = Schema.Struct({
  email: Schema.String,
  name: Schema.optional(Schema.String),
}).pipe(Type.makeObject(DXN.make('com.example.type.Contact', '0.1.0')));
interface Contact extends Type.InstanceType<typeof Contact> {}

const ExtractedRel = Schema.Struct({ id: Obj.ID }).pipe(
  Type.makeRelation({
    dxn: DXN.make('com.example.relation.extracted', '0.1.0'),
    source: Obj.Unknown,
    target: Obj.Unknown,
  }),
);

//
// Template + code wiring.
//

const PayloadSchema = Schema.Struct({ email: Schema.String, name: Schema.optional(Schema.String) });

const template: ExtractionTemplate = {
  id: 'com.example.extractor.contact',
  title: 'Contact',
  description: 'Extract a contact from a note.',
  kinds: ['contact'],
  sourceTypes: [Type.getTypename(Note)!],
  prompt: 'Extract the contact from the note.',
  targets: [{ type: Type.getTypename(Contact)!, identity: { fields: ['email'] } }],
  tags: [{ label: 'contact', hue: 'emerald' }],
};

const contactExtractor = makeTemplateExtractor({
  template,
  payloadSchema: PayloadSchema,
  match: () => ({ matched: true, confidence: 1 }),
  getSourceText: (source) => (source as Note).text,
  assemble: (payload, { source: _source }) =>
    Effect.gen(function* () {
      const { object, created } = yield* getOrCreate(Contact, Obj.make(Contact, payload), {
        identity: { email: payload.email },
        merge: (target, candidate) => {
          if (candidate.name !== undefined) {
            target.name = candidate.name;
          }
        },
      });
      return {
        created: created ? [object] : [],
        updated: created ? [] : [object],
        relations: [],
      } satisfies ExtractResult;
    }),
});

const operationServiceStub = Effect.provideService(Operation.Service, {
  invoke: () => Effect.die('Operation.Service stub'),
  schedule: () => Effect.die('Operation.Service stub'),
  invokePromise: async () => ({ error: new Error('Operation.Service stub') }),
} as any);

describe('template extractor + dispatch', () => {
  let builder: EchoTestBuilder;
  let db: EchoDatabase;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
    ({ db } = await builder.createDatabase({ types: [Note, Contact, ExtractedRel] }));
  });

  afterEach(async () => {
    await builder.close();
  });

  const resolverLayer = () =>
    fromResolvers({
      [Type.getTypename(Contact)!]: ({ email }: { email: string }) =>
        Effect.promise(() => db.query(Filter.type(Contact)).run()).pipe(
          Effect.map((contacts) => contacts.find((contact) => contact.email === email)),
        ),
    });

  test('extract — LLM payload becomes a Contact with the template tag', async ({ expect }) => {
    const source = db.add(Obj.make(Note, { text: 'Reach Ada at ada@example.test' }));
    await db.flush();

    const result = await contactExtractor
      .extract({ db, source })
      .pipe(
        Effect.provide(
          Layer.mergeAll(mockAiService({ object: { email: 'ada@example.test', name: 'Ada' } }), resolverLayer()),
        ),
      )
      .pipe(operationServiceStub)
      .pipe(runAndForwardErrors);

    expect(result.created).toHaveLength(1);
    const contact = result.created[0] as Contact;
    expect(contact.email).toBe('ada@example.test');
    expect(contact.name).toBe('Ada');
    expect(result.tags).toEqual([{ label: 'contact', hue: 'emerald' }]);
  });

  test('dispatch — persists created object and a provenance relation', async ({ expect }) => {
    const source = db.add(Obj.make(Note, { text: 'Reach Bo at bo@example.test' }));
    await db.flush();

    const outcome = await dispatch(
      { db, source },
      {
        provenance: ({ source: from, object }) =>
          Relation.make(ExtractedRel, { [Relation.Source]: object, [Relation.Target]: from }),
      },
    )
      .pipe(
        Effect.provide(
          Layer.mergeAll(
            fromExtractors([contactExtractor]),
            resolverLayer(),
            mockAiService({ object: { email: 'bo@example.test', name: 'Bo' } }),
          ),
        ),
      )
      .pipe(operationServiceStub)
      .pipe(runAndForwardErrors);

    expect(outcome.cancelled).toBe(false);
    expect(outcome.extractorId).toBe(template.id);

    await db.flush();
    const contacts = await db.query(Filter.type(Contact)).run();
    expect(contacts).toHaveLength(1);
    const relations = await db.query(Filter.type(ExtractedRel)).run();
    expect(relations).toHaveLength(1);
  });

  test('dispatch — onProposal returning undefined cancels all writes', async ({ expect }) => {
    const source = db.add(Obj.make(Note, { text: 'Reach Cy at cy@example.test' }));
    await db.flush();

    const outcome = await dispatch({ db, source }, { onProposal: () => Effect.succeed(undefined) })
      .pipe(
        Effect.provide(
          Layer.mergeAll(
            fromExtractors([contactExtractor]),
            resolverLayer(),
            mockAiService({ object: { email: 'cy@example.test' } }),
          ),
        ),
      )
      .pipe(operationServiceStub)
      .pipe(runAndForwardErrors);

    expect(outcome.cancelled).toBe(true);

    await db.flush();
    const contacts = await db.query(Filter.type(Contact)).run();
    expect(contacts).toHaveLength(0);
  });
});
