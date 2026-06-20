//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { describe, test } from 'vitest';

import { Operation, Routine, Trace, Trigger } from '@dxos/compute';
import { Database, Filter, Obj, Query } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { Automation } from '@dxos/plugin-automation';

import { dailyDigest } from './daily-digest';
import { researchBrief } from './research-brief';

const dbLayer = TestDatabaseLayer({
  types: [Automation.Automation, Routine.Routine, Trigger.Trigger, Operation.PersistentOperation],
});

const TestLayer = Layer.mergeAll(dbLayer, Trace.writerLayerNoop);

const templates = [
  { template: researchBrief, skillCount: 4 },
  { template: dailyDigest, skillCount: 3 },
];

describe('scheduled automation templates', () => {
  test('apply globally (no subject required)', ({ expect }) => {
    // Like Blank, these are offered in the global create dialog — no `appliesTo` gate.
    expect(researchBrief.appliesTo).toBeUndefined();
    expect(dailyDigest.appliesTo).toBeUndefined();
  });

  for (const { template, skillCount } of templates) {
    test(`${template.label} scaffolds a Routine, a disabled timer Trigger, and an Automation`, async ({ expect }) => {
      await Effect.gen(function* () {
        const automation = yield* template.scaffold({});
        yield* Database.add(automation);
        yield* Database.flush();

        expect(automation.triggers).toHaveLength(1);
        expect(automation.runnable).toBeDefined();

        const routines = yield* Database.query(Filter.type(Routine.Routine)).run;
        expect(routines).toHaveLength(1);
        expect(routines[0]?.skills).toHaveLength(skillCount);

        const triggers = yield* Database.query(Query.select(Filter.type(Trigger.Trigger))).run;
        expect(triggers).toHaveLength(1);
        const trigger = triggers[0];
        expect(trigger?.enabled).toBe(false);
        expect(trigger?.spec?.kind).toBe('timer');
        expect(trigger?.input?.prompt).toBeDefined();
        // The trigger is owned by the automation (cascade-deletes with it); the routine stays independent.
        expect(trigger && Obj.getParent(trigger)?.id).toBe(automation.id);
        expect(routines[0] && Obj.getParent(routines[0])).toBeUndefined();

        const operations = yield* Database.query(Filter.type(Operation.PersistentOperation)).run;
        expect(operations).toHaveLength(1);
        expect(automation.runnable?.uri).toBe(trigger?.function?.uri);
      }).pipe(Effect.provide(TestLayer), EffectEx.runAndForwardErrors);
    });
  }
});
