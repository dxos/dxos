//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { AssistantTestLayerWithTriggers } from '@dxos/agent-runtime/testing';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import { Annotation, Database, Obj, Ref, Type } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { DXN, EntityId } from '@dxos/keys';
import { Organization, Person } from '@dxos/types';

import { OperationTestLayer } from '../../../testing';
import { Load } from './definitions';
import { DatabaseHandlers } from './index';

EntityId.dangerouslyDisableRandomness();

/** A link in a ref chain; `next` is untyped so the schema needs no self-reference. */
class Chain extends Type.makeObject<Chain>(DXN.make('com.example.type.chain', '0.1.0'))(
  Schema.Struct({ name: Schema.String, next: Schema.optional(Ref.Ref(Obj.Unknown)) }).pipe(
    Annotation.LabelAnnotation.set(['name']),
  ),
) {}

const ChainTestLayer = AssistantTestLayerWithTriggers({
  operationHandlers: OperationHandlerSet.merge(DatabaseHandlers),
  types: [Chain],
  disableLlmMemoization: true,
});

describe('Load', () => {
  it.effect(
    'load: returns one entry per requested ref',
    Effect.fnUntraced(
      function* (_) {
        const organization = yield* Database.add(Obj.make(Organization.Organization, { name: 'Cyberdyne Systems' }));
        const person = yield* Database.add(Obj.make(Person.Person, { fullName: 'John Connor' }));
        yield* Database.flush();

        const loaded = yield* Operation.invoke(Load, { refs: [Ref.make(organization), Ref.make(person)] });

        const rows = yield* Schema.decodeUnknownEffect(Schema.Array(Schema.Struct({ id: Schema.String })))(loaded);
        expect(rows.map((row) => row.id)).toEqual([organization.id, person.id]);
      },
      Effect.provide(OperationTestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'load: expandDepth inlines one level of references and no more',
    Effect.fnUntraced(
      function* (_) {
        // A three-link chain, so a depth that overshot the clamp would be visible as an inlined tail.
        const tail = yield* Database.add(Obj.make(Chain, { name: 'tail' }));
        const middle = yield* Database.add(Obj.make(Chain, { name: 'middle', next: Ref.make(tail) }));
        const head = yield* Database.add(Obj.make(Chain, { name: 'head', next: Ref.make(middle) }));
        yield* Database.flush();

        const unexpanded = yield* Operation.invoke(Load, { refs: [Ref.make(head)] });
        const [envelope] = yield* nextRows(unexpanded);
        expect(envelope.next).toEqual({ '/': `echo:///${middle.id}` });

        // Depth is clamped, so this expands `head.next` and leaves `head.next.next` an envelope.
        const expanded = yield* Operation.invoke(Load, { refs: [Ref.make(head)], expandDepth: 5 });
        const [inlined] = yield* Schema.decodeUnknownEffect(
          Schema.Array(
            Schema.Struct({
              next: Schema.Struct({ id: Schema.String, name: Schema.String, next: Schema.Unknown }),
            }),
          ),
        )(expanded);
        expect(inlined.next).toMatchObject({ id: middle.id, name: 'middle' });
        expect(inlined.next.next).toEqual({ '/': `echo:///${tail.id}` });
      },
      Effect.provide(ChainTestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});

const nextRows = (results: unknown) =>
  Schema.decodeUnknownEffect(Schema.Array(Schema.Struct({ next: Schema.Unknown })))(results);
