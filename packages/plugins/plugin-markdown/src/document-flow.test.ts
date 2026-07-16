//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { Operation } from '@dxos/compute';
import { Database, EID, Ref } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { MarkdownPlugin } from '#plugin';

import { Markdown, MarkdownOperation } from './types';

// Headless coverage for the document flows exercised by `composer-app/src/playwright/basic.spec.ts`
// (`create document`) and the editor content used by `comments.spec.ts`. The Playwright tests type
// into a CodeMirror textbox; here we drive the same create/edit behaviour through the markdown
// plugin's operations against a real ECHO space from the composer test harness — no editor DOM.

const setup = async () => {
  const harness = await createComposerTestApp({ plugins: [ClientPlugin({}), MarkdownPlugin()] });
  const { personalSpace } = await EffectEx.runAndForwardErrors(
    initializeIdentity(harness.get(ClientCapabilities.Client)),
  );
  await harness.waitForEvent(ClientEvents.SpacesReady);
  return { harness, spaceId: personalSpace.id, db: personalSpace.db };
};

describe('markdown document flow', () => {
  test('create a document with content', async ({ expect }) => {
    const { harness, spaceId, db } = await setup();
    await using _harness = harness;

    await harness.runPromise(
      Effect.gen(function* () {
        const { id } = yield* Operation.invoke(
          MarkdownOperation.Create,
          { name: 'Welcome', content: 'Hello wold!' },
          { spaceId },
        );

        const doc = yield* Database.resolve(EID.parse(id), Markdown.Document).pipe(Effect.provide(Database.layer(db)));
        expect(doc.name).toBe('Welcome');

        // Content lives in a referenced Text object (what the editor binds to).
        const text = yield* Database.load(doc.content).pipe(Effect.provide(Database.layer(db)));
        expect(text.content).toBe('Hello wold!');
      }),
    );
  });

  test('edit document content', async ({ expect }) => {
    const { harness, spaceId, db } = await setup();
    await using _harness = harness;

    await harness.runPromise(
      Effect.gen(function* () {
        const { id } = yield* Operation.invoke(
          MarkdownOperation.Create,
          { name: 'Welcome', content: 'Hello wold!' },
          { spaceId },
        );
        const doc = yield* Database.resolve(EID.parse(id), Markdown.Document).pipe(Effect.provide(Database.layer(db)));

        // Playwright comments.spec `edit message` fixes the typo "wold" -> "world" in the editor.
        const { newContent } = yield* Operation.invoke(
          MarkdownOperation.Update,
          { doc: Ref.make(doc), edits: [{ oldString: 'wold', newString: 'world' }] },
          { spaceId },
        );
        expect(newContent).toBe('Hello world!');

        const text = yield* Database.load(doc.content).pipe(Effect.provide(Database.layer(db)));
        expect(text.content).toBe('Hello world!');
      }),
    );
  });

  test('append to document content', async ({ expect }) => {
    const { harness, spaceId, db } = await setup();
    await using _harness = harness;

    await harness.runPromise(
      Effect.gen(function* () {
        const { id } = yield* Operation.invoke(
          MarkdownOperation.Create,
          { name: 'Notes', content: 'Line one.' },
          { spaceId },
        );
        const doc = yield* Database.resolve(EID.parse(id), Markdown.Document).pipe(Effect.provide(Database.layer(db)));

        // Omitting `oldString` appends (collaboration.spec appends parts to a shared document).
        yield* Operation.invoke(
          MarkdownOperation.Update,
          { doc: Ref.make(doc), edits: [{ newString: ' Line two.' }] },
          { spaceId },
        );

        const text = yield* Database.load(doc.content).pipe(Effect.provide(Database.layer(db)));
        expect(text.content).toBe('Line one. Line two.');
      }),
    );
  });
});
