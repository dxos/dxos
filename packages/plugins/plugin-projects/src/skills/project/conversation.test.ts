//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { LanguageModelFixture, ScriptedLanguageModel } from '@dxos/ai/testing';
import { AiContext } from '@dxos/assistant';
import { Chat } from '@dxos/assistant-toolkit';
import { getSession } from '@dxos/compute/AgentService';
import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import { Database, Feed, Obj, Ref } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { TestHelpers } from '@dxos/effect/testing';
import { EID, EntityId } from '@dxos/keys';
import { Text } from '@dxos/schema';
import { Message, Outline, TaskSet } from '@dxos/types';

import { ProjectOperationHandlerSet } from '#operations';

import * as ProjectSkill from './ProjectSkill.ts';

const { text, toolCall } = ScriptedLanguageModel;

EntityId.dangerouslyDisableRandomness();

// The full Project–Chat–assistant loop, headless, asserted on the PROJECT (`artifacts` gains the
// filed object): a scripted model pins the operation wiring; a memoized live model proves a real
// model drives the same loop from the prompt alone.

const PROJECT_NAME = 'Voyage';
const DOC_CONTENT = 'Trip notes: packing list.';

/** Entity id underlying a ref/object URI, so space-qualified and local URIs compare equal. */
const entityId = (uri: string): string => {
  const eid = EID.tryParse(uri);
  return (eid && EID.getEntityId(eid)) ?? uri;
};

const TYPES = [
  Project.Project,
  Instructions.Instructions,
  Chat.Chat,
  AiContext.Binding,
  Feed.Feed,
  Message.Message,
  Outline.Outline,
  TaskSet.TaskSet,
  Text.Text,
];

/** Seeds the pair the way a project companion chat is wired: parent edge, shared instructions ref, feed bindings. */
const seedProjectChat = Effect.fnUntraced(function* () {
  const instructions = yield* Database.add(
    Instructions.make({ name: `${PROJECT_NAME} instructions`, text: `You manage the "${PROJECT_NAME}" project.` }),
  );
  const project = yield* Database.add(Project.make({ name: PROJECT_NAME, instructions: Ref.make(instructions) }));
  Obj.setParent(instructions, project);

  const feed = yield* Database.add(Feed.make());
  const chat = yield* Database.add(
    Chat.make({
      name: `${PROJECT_NAME} chat`,
      feed: Ref.make(feed),
      instructions: Ref.make(instructions),
    }),
  );
  Chat.linkCompanion({ chat, subject: project });
  Obj.setParent(feed, chat);

  const skill = yield* Database.add(ProjectSkill.make());
  const doc = yield* Database.add(Text.make({ content: DOC_CONTENT }));

  const runtime = yield* Effect.context<Database.Service>();
  const binder = yield* EffectEx.acquireReleaseResource(() => new AiContext.Binder({ feed, runtime }));
  yield* Effect.promise(() => binder.bind({ skills: [Ref.make(skill)], objects: [Ref.make(project), Ref.make(doc)] }));
  yield* Database.flush();

  return { project, chat, feed, doc };
});

describe('Project conversation', () => {
  {
    // Mutable on purpose: the tool-call input needs seeded URIs, so the test fills the captured
    // array after the seed runs (the scripted model reads turns at call time).
    const scriptedTurns: ScriptedLanguageModel.ScriptedTurn[] = [];

    const ScriptedTestLayer = AssistantTestLayer({
      operationHandlers: ProjectOperationHandlerSet.handlers,
      types: TYPES,
      skills: [ProjectSkill.make()],
      aiService: ScriptedLanguageModel.scriptedAiService(scriptedTurns),
    });

    it.effect(
      'scripted: the assistant files a document into the project via projects-add-artifact',
      Effect.fnUntraced(
        function* ({ expect }) {
          const { project, chat, feed, doc } = yield* seedProjectChat();

          // The parent edge is what every read path (outline sharing, navtree, cascade) hangs off.
          expect(Obj.getParent(chat)?.id).toBe(project.id);
          expect(project.artifacts).toHaveLength(0);

          scriptedTurns.push(
            {
              parts: [toolCall('projects-add-artifact', { project: Obj.getURI(project), object: Obj.getURI(doc) })],
            },
            { parts: [text('Filed the document into the project.')] },
          );

          const session = yield* getSession(feed, { instructions: chat.instructions });
          yield* session.submitPrompt('File the trip notes into the project.');
          yield* session.waitForCompletion();

          // The observable project update: the assistant's tool call landed in `artifacts`.
          expect(project.artifacts).toHaveLength(1);
          expect(entityId(project.artifacts[0].uri)).toBe(doc.id);
        },
        Effect.provide(ScriptedTestLayer),
        TestHelpers.provideTestContext,
      ),
    );
  }

  {
    const LiveTestLayer = AssistantTestLayer({
      operationHandlers: ProjectOperationHandlerSet.handlers,
      types: TYPES,
      skills: [ProjectSkill.make()],
      aiServicePreset: 'direct',
    });

    // Replays the recorded conversation from `.store/conversations` (DX_RUN_MODEL_FIXTURE_TESTS=1);
    // regenerate with DX_UPDATE_MODEL_FIXTURES=1 and DX_ANTHROPIC_API_KEY set.
    describe('live model', { tags: ['model-fixture'] }, () => {
      // TODO(burdon): Remove `.skip` once the fixture is recorded (needs 1p credentials):
      //   DX_UPDATE_MODEL_FIXTURES=1 moon run assistant-toolkit:test -- src/skills/project/conversation.test.ts
      it.effect.skip(
        'a prompt alone drives the model to file the document',
        Effect.fnUntraced(
          function* ({ expect }) {
            const { project, feed, doc } = yield* seedProjectChat();

            const session = yield* getSession(feed);
            yield* session.submitPrompt(
              'A document with trip notes is bound into this chat, alongside the project. ' +
                "File that document into the project's artifacts, then confirm in one sentence.",
            );
            yield* session.waitForCompletion();

            expect(project.artifacts).toHaveLength(1);
            expect(entityId(project.artifacts[0].uri)).toBe(doc.id);
          },
          Effect.provide(LiveTestLayer),
          TestHelpers.provideTestContext,
        ),
        { timeout: LanguageModelFixture.isUpdateEnabled() ? 240_000 : 30_000 },
      );
    });
  }
});
