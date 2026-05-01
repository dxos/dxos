//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AgentService } from '@dxos/assistant';
import { AssistantTestLayer } from '@dxos/assistant/testing';
import { Blueprint } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { log } from '@dxos/log';
import { Markdown } from '@dxos/plugin-markdown/types';
import { Text } from '@dxos/schema';
import { trim } from '@dxos/util';

import { MarkdownHandlers } from '../markdown';
import DesignBlueprint from './blueprint';

const TestLayer = AssistantTestLayer({
  operationHandlers: MarkdownHandlers,
  types: [Text.Text, Markdown.Document, Blueprint.Blueprint],
  blueprints: [DesignBlueprint.make()],
});

describe('Design Blueprint', { timeout: 120_000 }, () => {
  it.scoped(
    'design blueprint',
    Effect.fn(
      function* ({ expect }) {
        const agent = yield* AgentService.createSession({
          blueprints: [DesignBlueprint.make()],
        });

        const artifact = yield* Database.add(Markdown.make({ content: 'Hello, world!' }));
        let prevContent = artifact.content;

        {
          const prompt = trim`
            I want to design a new feature for our product.

            We need to add a user profile system with the following requirements:
            1. Users should be able to create and edit their profiles
            2. Profile should include basic info like name, bio, avatar
            3. Users can control privacy settings for their profile
            4. Profile should show user's activity history
            5. Need to consider data storage and security implications

            Let's capture the key design decisions in our spec in ${Obj.getDXN(artifact)}
          `;

          yield* agent.submitPrompt(prompt);
          yield* agent.waitForCompletion();
          log.info('spec', { doc: artifact });
          expect(artifact.content).not.toBe(prevContent);
          prevContent = artifact.content;
        }

        {
          const prompt = trim`
            I want this to be built on top of Durable Objects and SQLite database.
            Adjust the spec to reflect this.
          `;

          yield* agent.submitPrompt(prompt);
          yield* agent.waitForCompletion();
          expect(artifact.content).not.toBe(prevContent);
          prevContent = artifact.content;
        }
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { tags: ['llm'] },
  );
});
