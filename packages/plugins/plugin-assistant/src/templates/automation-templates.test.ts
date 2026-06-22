//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { describe, test } from 'vitest';

import { Operation, Instructions, Trace, Trigger } from '@dxos/compute';
import { Database, Filter, Obj, Query } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { Routine } from '@dxos/plugin-routine';

import { dailyDigest } from './daily-digest';
import { researchBrief } from './research-brief';

const dbLayer = TestDatabaseLayer({
  types: [Routine.Routine, Instructions.Instructions, Trigger.Trigger, Operation.PersistentOperation],
});

const TestLayer = Layer.mergeAll(dbLayer, Trace.writerLayerNoop);

const templates = [
  { template: researchBrief, blueprintCount: 4 },
  { template: dailyDigest, blueprintCount: 3 },
];

describe('scheduled routine templates', () => {
  test('apply globally (no subject required)', ({ expect }) => {
    // Like Blank, these are offered in the global create dialog — no `appliesTo` gate.
    expect(researchBrief.appliesTo).toBeUndefined();
    expect(dailyDigest.appliesTo).toBeUndefined();
  });

  for (const { template, blueprintCount } of templates) {
    test(`${template.label} scaffolds a Routine, a disabled timer Trigger, and Instructions`, async ({ expect }) => {
      await Effect.gen(function* () {
        const routine = yield* template.scaffold({});
        yield* Database.add(routine);
        yield* Database.flush();

        expect(routine.triggers).toHaveLength(1);
        expect(routine.runnable).toBeDefined();

        const routines = yield* Database.query(Filter.type(Instructions.Instructions)).run;
        expect(routines).toHaveLength(1);
        expect(routines[0]?.blueprints).toHaveLength(blueprintCount);

        const triggers = yield* Database.query(Query.select(Filter.type(Trigger.Trigger))).run;
        expect(triggers).toHaveLength(1);
        const trigger = triggers[0];
        expect(trigger?.enabled).toBe(false);
        expect(trigger?.spec?.kind).toBe('timer');
        expect(trigger?.input?.instructions).toBeDefined();
        // The trigger is owned by the routine (cascade-deletes with it); the instructions stays independent.
        expect(trigger && Obj.getParent(trigger)?.id).toBe(routine.id);
        expect(routines[0] && Obj.getParent(routines[0])).toBeUndefined();

        const operations = yield* Database.query(Filter.type(Operation.PersistentOperation)).run;
        expect(operations).toHaveLength(1);
        expect(routine.runnable?.uri).toBe(trigger?.function?.uri);
      }).pipe(Effect.provide(TestLayer), EffectEx.runAndForwardErrors);
    });
  }
});
