//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Instructions, Project } from '@dxos/compute';
import { operationServiceLayerNoop } from '@dxos/compute/testing';
import { Database, Obj, Ref, URI } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { registryLayerNoop } from '@dxos/echo/testing';
import { Text } from '@dxos/schema';

import { formatSystemPrompt } from './format';

const testLayer = () =>
  Layer.mergeAll(
    TestDatabaseLayer({ types: [Instructions.Instructions, Project.Project, Text.Text] }),
    registryLayerNoop,
    operationServiceLayerNoop,
  );

describe('formatSystemPrompt', () => {
  it.effect('renders bound Instructions inline (text + commands), not as object stubs', () =>
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

      const prompt = yield* formatSystemPrompt({ system: 'Base prompt.', objects: [instructions] });
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
      Obj.update(instructions, (current) => {
        current.text = Ref.fromURI(URI.make('dxn:echo:@:missing-text'));
      });

      const prompt = yield* formatSystemPrompt({ objects: [instructions] });
      expect(prompt).toContain('## Instructions');
      expect(prompt).toContain('`$go`: Go.');
      expect(prompt).not.toContain('unreachable');
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('keeps non-instructions objects as context stubs, carrying their label', () =>
    Effect.gen(function* () {
      const doc = yield* Database.add(Text.make({ content: 'plain object' }));
      const project = yield* Database.add(Project.make({ name: 'Voyage' }));
      const prompt = yield* formatSystemPrompt({ objects: [doc, project] });
      expect(prompt).toContain('## Context Objects');
      expect(prompt).toContain(Obj.getURI(doc));
      expect(prompt).toContain('<label>Voyage</label>');
      expect(prompt).not.toContain('## Instructions');
    }).pipe(Effect.provide(testLayer())),
  );
});
