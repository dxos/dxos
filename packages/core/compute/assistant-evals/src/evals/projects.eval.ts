//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { evalite } from 'evalite';

import { AiContext } from '@dxos/assistant';
import { Chat, ProjectSkill } from '@dxos/assistant-toolkit';
import * as Project from '@dxos/compute/Project';
import { Collection, Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { EID } from '@dxos/keys';
import { Markdown } from '@dxos/plugin-markdown';
import { MarkdownPlugin } from '@dxos/plugin-markdown/plugin';
import { trim } from '@dxos/util';

import { findObject } from '../assertions';
import { createEvalRunner } from '../runner';
import { getDefaultSkills } from '../skills';

// The plugin-projects system test: a Chat runs in a Project's context (the project's own
// Instructions, passed by reference) and the model is directed to create a markdown document.
// Graded on DB effects: the document exists, is bound into the session context, and is filed
// into the project's artifacts collection (the ProjectSkill add-artifact tool) — binding alone
// proves the session saw the object; only the collection check proves the project owns it.

const PROJECT_NAME = 'Voyage';

/** Entity id underlying a ref or object URI, so space-qualified and local URIs compare equal. */
const entityId = (uri: string): string => {
  const eid = EID.tryParse(uri);
  return (eid && EID.getEntityId(eid)) ?? uri;
};

const task = createEvalRunner({
  instructions: trim`
    You manage the "${PROJECT_NAME}" project (its reference is bound into this chat).
    Create a markdown document titled "Trip Notes" with a short packing list (3 items).
    Then add the document to the chat context, and file it into the project's artifacts.
  `,
  input: Schema.Unknown,
  output: Schema.Unknown,
  skills: [...getDefaultSkills(), Ref.make(ProjectSkill.make())],
  plugins: [MarkdownPlugin()],
  types: [Project.Project, Collection.Collection],
  // Multi-tool scenario (create + context-add + artifact-add), so allow more round-trips.
  timeout: 150_000,
  seed: ({ instructions }) =>
    Effect.gen(function* () {
      const collection = yield* Database.add(Collection.make());
      const project = yield* Database.add(
        Project.make({
          name: PROJECT_NAME,
          instructions: Ref.make(instructions),
          artifacts: Ref.make(collection),
        }),
      );
      Obj.setParent(collection, project);

      // The chat mirrors ProjectOperation.CreateChat: parented to the project, steering
      // instructions passed by reference (the project's own Instructions object).
      const feed = yield* Database.add(Feed.make());
      const chat = yield* Database.add(
        Chat.make({ name: `${PROJECT_NAME} Chat`, feed: Ref.make(feed), instructions: Ref.make(instructions) }),
      );
      Obj.setParent(chat, project);
      yield* Database.flush();

      return { objects: [Ref.make(project)], chat: Ref.make(chat) };
    }),
  dbQuery: () =>
    Effect.gen(function* () {
      const document = yield* findObject(Markdown.Document, () => true);
      const project = yield* findObject(Project.Project, (project) => project.name === PROJECT_NAME);
      if (!document || !project?.artifacts) {
        return { documentCreated: !!document, filed: false, bound: false };
      }
      const documentId = entityId(Obj.getURI(document));

      const artifacts = yield* Database.load(project.artifacts);
      const filed = artifacts.objects.some((ref) => entityId(ref.uri) === documentId);

      // Bound = a Binding record in the chat feed added the document to the session context.
      const chat = yield* findObject(Chat.Chat, () => true);
      let bound = false;
      if (chat) {
        const feed = yield* Database.load(chat.feed);
        const bindings = yield* Feed.query(feed, Filter.type(AiContext.Binding)).run;
        bound = bindings.some((binding) => binding.objects.added.some((ref) => entityId(ref.uri) === documentId));
      }

      return { documentCreated: true, filed, bound };
    }),
});

evalite('Projects — project chat creates and files an artifact', {
  data: [{ input: null }],
  task,
  scorers: [
    {
      name: 'document-created',
      description: 'A Markdown Document exists in the DB after the run.',
      scorer: ({ output }) => (output.dbQuery.documentCreated ? 1 : 0),
    },
    {
      name: 'document-filed',
      description: "The document is in the project's artifacts collection (add-artifact tool).",
      scorer: ({ output }) => (output.dbQuery.filed ? 1 : 0),
    },
    {
      name: 'document-bound',
      description: 'A Binding record in the chat feed added the document to the session context.',
      scorer: ({ output }) => (output.dbQuery.bound ? 1 : 0),
    },
  ],
});
