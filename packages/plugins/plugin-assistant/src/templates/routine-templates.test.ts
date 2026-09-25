//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import * as Instructions from '@dxos/compute/Instructions';
import * as Routine from '@dxos/compute/Routine';
import * as Trigger from '@dxos/compute/Trigger';
import { Database, Obj } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';

import { dailyDigest } from './daily-digest.ts';
import { researchBrief } from './research-brief.ts';

const templates = [
  { template: researchBrief, skillCount: 4 },
  { template: dailyDigest, skillCount: 3 },
];

describe('scheduled routine templates', () => {
  test('are listed in the create picker and need no input', ({ expect }) => {
    for (const { template } of templates) {
      expect(template.hidden).toBeUndefined();
      expect(template.inputSchema).toBeUndefined();
    }
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

      // Timer trigger, enabled (the dialog is the review step), owned by the routine.
      const trigger = draft.triggers[0]?.target;
      expect(trigger != null && Obj.instanceOf(Trigger.Trigger, trigger)).toBe(true);
      expect(trigger?.enabled).toBe(true);
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
