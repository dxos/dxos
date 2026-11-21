//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as TestClock from 'effect/testing/TestClock';

import { LanguageModelFixture } from '@dxos/ai/testing';
import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { operationServiceLayerNoop } from '@dxos/compute/testing';
import { Database, Obj, Ref, URI } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { registryLayerNoop } from '@dxos/echo/testing';
import { Text } from '@dxos/schema';

import { formatBindingChanges, formatSkills, formatSystemPrompt } from './format.ts';

const testLayer = () =>
  Layer.mergeAll(
    TestDatabaseLayer({ types: [Instructions.Instructions, Project.Project, Text.Text] }),
    registryLayerNoop,
    operationServiceLayerNoop,
  );

describe('formatSystemPrompt', () => {
  it.effect('renders Instructions inline (text + commands), not as object stubs', () =>
    Effect.gen(function* () {
      const instructions = yield* Database.add(
        Instructions.make({
          name: 'Instructions',
          text: 'Answer like a pirate.',
          commands: [
            { sentinel: '$track', description: 'Track a follow-up', prompt: 'Append the item to the task list.' },
          ],
        }),
      );

      const prompt = yield* formatSystemPrompt({ system: 'Base prompt.', instructions: [instructions] });
      expect(prompt).toContain('Base prompt.');
      expect(prompt).toContain('## Instructions');
      expect(prompt).toContain('Answer like a pirate.');
      expect(prompt).toContain('`$track` (Track a follow-up): Append the item to the task list.');
      // The instructions must not degrade to a load-it-yourself context stub.
      expect(prompt).not.toContain('## Context Objects');
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('degrades to a commands-only block when the text ref is broken', () =>
    Effect.gen(function* () {
      const instructions = yield* Database.add(
        Instructions.make({
          name: 'Instructions',
          text: 'unreachable',
          commands: [{ sentinel: '$go', prompt: 'Go.' }],
        }),
      );
      yield* Database.flush();
      Obj.update(instructions, (instructions) => {
        instructions.text = Ref.fromURI(URI.make('dxn:echo:@:missing-text'));
      });

      const prompt = yield* formatSystemPrompt({ instructions: [instructions] });
      expect(prompt).toContain('## Instructions');
      expect(prompt).toContain('`$go`: Go.');
      expect(prompt).not.toContain('unreachable');
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('treats a bound Instructions object as an ordinary context stub', () =>
    Effect.gen(function* () {
      // Steering is declared by the `instructions` parameter, so a bound Instructions object is
      // subject matter (e.g. "help me edit these") rather than something the session must obey.
      const instructions = yield* Database.add(Instructions.make({ name: 'Draft', text: 'Answer like a pirate.' }));
      const prompt = yield* formatSystemPrompt({ objects: [instructions] });
      expect(prompt).toContain('## Context Objects');
      expect(prompt).toContain(`- ${Obj.getTypename(instructions)} ${Obj.getURI(instructions)} "Draft"`);
      expect(prompt).not.toContain('## Instructions');
      expect(prompt).not.toContain('Answer like a pirate.');
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect("ends with today's date in UTC, read from the clock", () =>
    Effect.gen(function* () {
      yield* TestClock.setTime(Date.UTC(2026, 10, 19, 23, 59));
      const prompt = yield* formatSystemPrompt({ system: 'Base prompt.' });
      expect(prompt).toBe(
        'Base prompt.\n\n## Current Date\n\n' +
          'Today is Thursday, 2026-11-19 (UTC). Use it to resolve relative dates and dates given without a year.',
      );

      // Model fixtures match without the section, so a recording outlives the day it was made on.
      expect(LanguageModelFixture.__testing.normalizeForMatching(prompt, [])).toBe('Base prompt.');

      // A day, not a time: the prompt changes only when the UTC date does.
      yield* TestClock.adjust('1 minute');
      expect(yield* formatSystemPrompt({ system: 'Base prompt.' })).toContain('Today is Friday, 2026-11-20 (UTC).');
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('keeps non-instructions objects as context stubs, carrying their label', () =>
    Effect.gen(function* () {
      const doc = yield* Database.add(Text.make({ content: 'plain object' }));
      const project = yield* Database.add(Project.make({ name: 'Voyage' }));
      const prompt = yield* formatSystemPrompt({ objects: [doc, project] });
      expect(prompt).toContain('## Context Objects');
      expect(prompt).toContain(Obj.getURI(doc));
      expect(prompt).toContain(`- ${Obj.getTypename(project)} ${Obj.getURI(project)} "Voyage"`);
      expect(prompt).not.toContain('## Instructions');
    }).pipe(Effect.provide(testLayer())),
  );
});

describe('formatBindingChanges', () => {
  const skill = (name: string, source: string) =>
    Skill.make({ key: `com.example.skill.${name.toLowerCase()}`, name, instructions: Template.make({ source }) });

  it.effect('states the skills enabled and disabled, and the objects added, since the turn began', () =>
    Effect.gen(function* () {
      const kept = skill('Kept', 'Kept rules.');
      const dropped = skill('Dropped', 'Dropped rules.');
      const added = skill('Added', 'Added rules.');
      const existing = yield* Database.add(Project.make({ name: 'Existing' }));
      const bound = yield* Database.add(Project.make({ name: 'Voyage' }));

      const unbound = yield* Database.add(Project.make({ name: 'Unbound' }));
      const changes = yield* formatBindingChanges(
        { skills: [kept, dropped], objects: [existing, unbound] },
        { skills: [kept, added], objects: [existing, bound] },
      );
      expect(changes).toHaveLength(4);
      const [enabled, disabled, objects, removed] = changes;
      expect(removed).toContain(Obj.getURI(unbound));
      expect(enabled).toContain('Added rules.');
      expect(enabled).not.toContain('Kept rules.');
      // Named as the definition it disables is.
      expect(disabled).toContain('"Dropped"');
      expect(yield* formatSkills([dropped])).toContain('<skill name="Dropped">');
      expect(objects).toContain(`- ${Obj.getTypename(bound)} ${Obj.getURI(bound)} "Voyage"`);
      expect(objects).not.toContain('Existing');
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('is empty when nothing changed', () =>
    Effect.gen(function* () {
      const kept = skill('Kept', 'Kept rules.');
      const object = yield* Database.add(Project.make({ name: 'Voyage' }));
      // Equal by id, not by array identity: the bindings are read afresh on every iteration.
      expect(
        yield* formatBindingChanges({ skills: [kept], objects: [object] }, { skills: [kept], objects: [object] }),
      ).toEqual([]);
    }).pipe(Effect.provide(testLayer())),
  );
});
