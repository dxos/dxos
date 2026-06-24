//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { Instructions, Trigger } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { Routine } from '@dxos/plugin-routine';

import { dailyDigest } from './daily-digest';
import { researchBrief } from './research-brief';

const templates = [
  { template: researchBrief, skillCount: 4 },
  { template: dailyDigest, skillCount: 3 },
];

describe('scheduled routine templates', () => {
  test('apply only in the global create dialog (no companion subject)', ({ expect }) => {
    // These templates appear only in the global create dialog, not in object companions.
    expect(dailyDigest.appliesTo?.(undefined)).toBe(true);
    expect(researchBrief.appliesTo?.(undefined)).toBe(true);
    expect(dailyDigest.appliesTo?.({} as Obj.Unknown)).toBe(false);
    expect(researchBrief.appliesTo?.({} as Obj.Unknown)).toBe(false);
  });

  for (const { template, skillCount } of templates) {
    test(`${template.label} scaffolds an in-memory RoutineDraft with a disabled timer Trigger and Instructions`, async ({
      expect,
    }) => {
      // Templates are in-memory (no DB calls); Database.notAvailable surfaces any accidental DB access.
      const draft = await EffectEx.runPromise(template.scaffold({}).pipe(Effect.provide(Database.notAvailable)));

      // Routine shell — the runnable is set at save time via RunInstructions.
      expect(Obj.instanceOf(Routine.Routine, draft.routine)).toBe(true);
      expect(draft.routine.runnable).toBeUndefined();

      // Instructions with the right skill set.
      expect(Obj.instanceOf(Instructions.Instructions, draft.instructions)).toBe(true);
      expect(draft.instructions?.skills).toHaveLength(skillCount);

      // Timer trigger, disabled by default.
      expect(Obj.instanceOf(Trigger.Trigger, draft.trigger)).toBe(true);
      expect(draft.trigger?.enabled).toBe(false);
      expect(draft.trigger?.spec?.kind).toBe('timer');
    });
  }
});
