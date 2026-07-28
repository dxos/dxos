//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';
import { expect, fn, userEvent, waitFor } from 'storybook/test';

import { Text as EchoText, Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Markdown } from '@dxos/plugin-markdown';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { Panel, Toolbar } from '@dxos/react-ui';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';
import { Branch } from '@dxos/versioning';

import { STORY_AGENTS, seedAgentSuggestions } from '../../testing';
import { SuggestionSources, type SuggestionSourcesProps } from './SuggestionSources';

// A single, deliberately distinct author/content for the second document — neither this DID nor this
// text overlaps `STORY_AGENTS`, so any trace of it (or of `STORY_AGENTS`' content) on the wrong side
// of a swap is unambiguous.
const SECOND_DOC_DID = 'did:agent:zephyr';
const SECOND_DOC_CONTENT = 'Zephyr proposes an entirely different rewrite of the second document.';

/**
 * Seeds a single `kind:'suggestion'` branch with an arbitrary author/content, mirroring
 * `seedAgentSuggestions`'s internals but for one caller-supplied branch rather than the fixed
 * `STORY_AGENTS` pair — gives the second document content that can't be confused with the first's.
 */
const seedSingleSuggestion = async (doc: Markdown.Document, parent: Text.Text, did: string, content: string) => {
  const branch = await Branch.suggestion(doc, parent, did);
  const binding = await Branch.bind(doc, branch);
  Obj.update(binding.object, () => {
    EchoText.update(binding.object, 'content', content);
  });
  binding.dispose();
};

const seedDocument = async (
  space: NonNullable<ReturnType<typeof useClientStory>['space']>,
  name: string,
  content: string,
  seed: (doc: Markdown.Document, text: Text.Text) => Promise<void>,
): Promise<Markdown.Document> => {
  const doc = Markdown.make({ name, content });
  space.db.add(doc);
  await space.db.flush({ indexes: true });
  const text = await doc.content.load();
  invariant(text, 'document content not loaded');
  await seed(doc, text);
  await space.db.flush({ indexes: true });
  return doc;
};

type StoryArgs = Pick<SuggestionSourcesProps, 'onResolved'> & {
  /** Seeds a second document and a Swap button that toggles which one is passed as `document`. */
  swap?: boolean;
};

/**
 * Seeds a document with two agent-authored suggestion branches (reusing `seedAgentSuggestions` from
 * the `CommentsArticle` story) in a real ECHO space, then mounts `SuggestionSources` against it — the
 * seeding is async/DB-backed, so this is exercised via a play test rather than a static render. With
 * `swap`, a second document (one distinct author) and a Swap button are added so the same mounted
 * instance can be pointed at a different document.
 */
const DefaultStory = ({ onResolved, swap }: StoryArgs) => {
  const { space } = useClientStory();
  const [documents, setDocuments] = useState<Markdown.Document[]>();
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!space) {
      return;
    }

    let disposed = false;
    void (async () => {
      const first = await seedDocument(space, 'Doc A', 'First document content.', (doc, text) =>
        seedAgentSuggestions(doc, text),
      );
      const second = swap
        ? await seedDocument(space, 'Doc B', 'Second document content.', (doc, text) =>
            seedSingleSuggestion(doc, text, SECOND_DOC_DID, SECOND_DOC_CONTENT),
          )
        : undefined;

      if (!disposed) {
        setDocuments(second ? [first, second] : [first]);
      }
    })();

    return () => {
      disposed = true;
    };
  }, [space, swap]);

  if (!documents) {
    return <Loading />;
  }

  return (
    <Panel.Root>
      {swap && (
        <Panel.Toolbar asChild>
          <Toolbar.Root>
            <Toolbar.Button
              data-testid='swap-document'
              onClick={() => setActive((current) => (current + 1) % documents.length)}
            >
              Swap
            </Toolbar.Button>
          </Toolbar.Root>
        </Panel.Toolbar>
      )}
      <Panel.Content>
        <SuggestionSources document={documents[active]} onResolved={onResolved}>
          {(resolved) => (
            <div data-testid='resolved-content'>
              {resolved.map((source) => (
                <div key={source.author}>{source.content}</div>
              ))}
            </div>
          )}
        </SuggestionSources>
      </Panel.Content>
    </Panel.Root>
  );
};

const meta = {
  title: 'plugins/plugin-review/components/SuggestionSources',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'column' }),
    withClientProvider({ types: [Markdown.Document, Text.Text], createIdentity: true, createSpace: true }),
  ],
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Reactive enumeration of a document's suggestion branches:
 * - Seeds two agent-authored `kind:'suggestion'` branches (deterministic; no LLM).
 * - The headless component binds each and resolves its live content.
 * - Asserts `onResolved` eventually reports both authors with their proposed content.
 */
export const Default: Story = {
  args: { onResolved: fn() },
  play: async ({ args }) => {
    // Order matches branch enumeration order (push order in `seedAgentSuggestions`: Kai then Nova).
    // Matched per field: each resolved branch also carries its fork `base` (and may carry a `hue`).
    const expected = STORY_AGENTS.map((agent) =>
      expect.objectContaining({ author: agent.did, content: agent.content }),
    );
    await waitFor(() => expect(args.onResolved).toHaveBeenCalledWith(expected), { timeout: 12_000 });
  },
};

/**
 * Regression test for the render-prop's core guarantee — no stale frame on document swap:
 * - Swapping `document` on an already-mounted instance must never paint a frame showing the PREVIOUS
 *   document's resolved sources.
 * - The old `onResolved`-only + `useState`-in-parent design had this bug (the update lands post-commit,
 *   so the parent's first render after a swap used stale state).
 * - The render-prop computes `resolved` from the current `document` in its own render, so the very
 *   next render after the swap is synchronously correct.
 */
export const SwapDocument: Story = {
  args: { swap: true },
  play: async ({ canvasElement }) => {
    const text = () => canvasElement.textContent ?? '';
    const swapButton = () => canvasElement.querySelector<HTMLButtonElement>('[data-testid="swap-document"]');

    // Doc A's suggestions (Kai + Nova) resolve first.
    await waitFor(() => expect(text()).toContain(STORY_AGENTS[0].content), { timeout: 12_000 });
    await waitFor(() => expect(text()).toContain(STORY_AGENTS[1].content), { timeout: 12_000 });

    // Swap to Doc B. Assert straight after the click (no `waitFor`) that no trace of Doc A's content
    // survives — the stale frame this test guards against would show up right here, before Doc B's
    // own probes have had any chance to resolve.
    const swap = swapButton();
    invariant(swap, 'swap-document button not rendered');
    await userEvent.click(swap);
    await expect(text()).not.toContain(STORY_AGENTS[0].content);
    await expect(text()).not.toContain(STORY_AGENTS[1].content);

    // Doc B's own suggestion eventually resolves, and only its content is ever shown.
    await waitFor(() => expect(text()).toContain(SECOND_DOC_CONTENT), { timeout: 12_000 });
    await expect(text()).not.toContain(STORY_AGENTS[0].content);
    await expect(text()).not.toContain(STORY_AGENTS[1].content);
  },
};
