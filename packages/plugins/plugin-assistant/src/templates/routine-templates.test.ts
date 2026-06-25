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
    test(`${template.label} scaffolds an in-memory routine draft graph with a disabled timer trigger and instructions`, async ({
      expect,
    }) => {
      // Templates are in-memory (no DB calls); Database.notAvailable surfaces any accidental DB access.
      const draft = await EffectEx.runPromise(template.scaffold({}).pipe(Effect.provide(Database.notAvailable)));

      // The draft is a routine graph wired for an instructions action (spec → RunInstructions).
      expect(Obj.instanceOf(Routine.Routine, draft)).toBe(true);
      expect(draft.spec?.kind).toBe('instructions');

      // Timer trigger, disabled by default, owned by the routine.
      const trigger = draft.triggers[0]?.target;
      expect(trigger != null && Obj.instanceOf(Trigger.Trigger, trigger)).toBe(true);
      expect(trigger?.enabled).toBe(false);
      expect(trigger?.spec?.kind).toBe('timer');

      // The owned instructions is the routine's action (an instructions action), with the right skill set.
      const instructions = Routine.instructionsRef(draft)?.target;
      expect(Obj.instanceOf(Instructions.Instructions, instructions)).toBe(true);
      expect(Obj.instanceOf(Instructions.Instructions, instructions) ? instructions.skills : []).toHaveLength(
        skillCount,
      );
    });
  }
});
