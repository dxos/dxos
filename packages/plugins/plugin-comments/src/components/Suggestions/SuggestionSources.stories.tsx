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
import { Loading, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';
import { Branch } from '@dxos/versioning';

import { STORY_AGENTS, seedAgentSuggestions } from '../../containers/CommentsArticle/CommentsArticle.stories';
import { SuggestionSources, type SuggestionSourcesProps } from './SuggestionSources';

type StoryArgs = Pick<SuggestionSourcesProps, 'onResolved'>;

/**
 * Seeds a document with two agent-authored suggestion branches (reusing `seedAgentSuggestions` from
 * the `CommentsArticle` story) in a real ECHO space, then mounts `SuggestionSources` against it — the
 * seeding is async/DB-backed, so this is exercised via a play test rather than a static render.
 */
const StorySources = ({ onResolved }: StoryArgs) => {
  const { space } = useClientStory();
  const [document, setDocument] = useState<Markdown.Document>();

  useEffect(() => {
    if (!space) {
      return;
    }

    let disposed = false;
    void (async () => {
      const doc = Markdown.make({ name: 'Sample', content: 'Sample content.' });
      space.db.add(doc);
      await space.db.flush({ indexes: true });

      const text = await doc.content.load();
      invariant(text, 'document content not loaded');
      await seedAgentSuggestions(doc, text);
      await space.db.flush({ indexes: true });

      if (!disposed) {
        setDocument(doc);
      }
    })();

    return () => {
      disposed = true;
    };
  }, [space]);

  if (!document) {
    return <Loading />;
  }

  return <SuggestionSources document={document} onResolved={onResolved} />;
};

const meta = {
  title: 'plugins/plugin-comments/components/SuggestionSources',
  render: StorySources,
  decorators: [
    withTheme(),
    withClientProvider({ types: [Markdown.Document, Text.Text], createIdentity: true, createSpace: true }),
  ],
  parameters: { layout: 'fullscreen', controls: { disable: true } },
} satisfies Meta<typeof StorySources>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Two agent-authored suggestion branches resolve reactively — asserts `onResolved` eventually reports
 * both authors with their proposed content (deterministic; no LLM).
 */
export const Default: Story = {
  args: { onResolved: fn() },
  play: async ({ args }) => {
    // Order matches branch enumeration order (push order in `seedAgentSuggestions`: Kai then Nova).
    const expected = STORY_AGENTS.map((agent) => ({ author: agent.did, content: agent.content }));
    await waitFor(() => expect(args.onResolved).toHaveBeenCalledWith(expected), { timeout: 12_000 });
  },
};

// A single, deliberately distinct author/content for the second document in `SwapDocument` — neither
// this DID nor this text overlaps `STORY_AGENTS`, so any trace of it (or of `STORY_AGENTS`' content)
// on the wrong side of the swap is unambiguous.
const SECOND_DOC_DID = 'did:agent:zephyr';
const SECOND_DOC_CONTENT = 'Zephyr proposes an entirely different rewrite of the second document.';

/**
 * Seeds a single `kind:'suggestion'` branch with an arbitrary author/content, mirroring
 * `seedAgentSuggestions`'s internals but for one caller-supplied branch rather than the fixed
 * `STORY_AGENTS` pair — used to give the `SwapDocument` story's second document content that can't be
 * confused with the first document's.
 */
const seedSingleSuggestion = async (doc: Markdown.Document, parent: Text.Text, did: string, content: string) => {
  const branch = await Branch.suggestion(doc, parent, did);
  const binding = await Branch.bind(doc, branch);
  Obj.update(binding.object, () => {
    EchoText.update(binding.object, 'content', content);
  });
  binding.dispose();
};

/**
 * Mounts `SuggestionSources` via its render-prop against two already-seeded documents, toggling
 * which one is passed as `document` on a button click — reproduces the swap the review companion
 * performs when the user switches which document it shows on an already-mounted instance.
 */
const StorySwap = () => {
  const { space } = useClientStory();
  const [docA, setDocA] = useState<Markdown.Document>();
  const [docB, setDocB] = useState<Markdown.Document>();
  const [active, setActive] = useState<'a' | 'b'>('a');

  useEffect(() => {
    if (!space) {
      return;
    }

    let disposed = false;
    void (async () => {
      const a = Markdown.make({ name: 'Doc A', content: 'First document content.' });
      space.db.add(a);
      await space.db.flush({ indexes: true });
      const textA = await a.content.load();
      invariant(textA, 'document content not loaded');
      await seedAgentSuggestions(a, textA);
      await space.db.flush({ indexes: true });

      const b = Markdown.make({ name: 'Doc B', content: 'Second document content.' });
      space.db.add(b);
      await space.db.flush({ indexes: true });
      const textB = await b.content.load();
      invariant(textB, 'document content not loaded');
      await seedSingleSuggestion(b, textB, SECOND_DOC_DID, SECOND_DOC_CONTENT);
      await space.db.flush({ indexes: true });

      if (!disposed) {
        setDocA(a);
        setDocB(b);
      }
    })();

    return () => {
      disposed = true;
    };
  }, [space]);

  if (!docA || !docB) {
    return <Loading />;
  }

  return (
    <>
      <button
        type='button'
        data-testid='swap-document'
        onClick={() => setActive((current) => (current === 'a' ? 'b' : 'a'))}
      >
        Swap
      </button>
      <SuggestionSources document={active === 'a' ? docA : docB}>
        {(resolved) => (
          <div data-testid='resolved-content'>
            {resolved.map((source) => (
              <div key={source.author}>{source.content}</div>
            ))}
          </div>
        )}
      </SuggestionSources>
    </>
  );
};

/**
 * Regression test for the render-prop's core guarantee: swapping `document` on an already-mounted
 * instance must never paint a frame that shows the PREVIOUS document's resolved sources (the bug the
 * `onResolved`-only, `useState`-in-parent design had — that update lands post-commit, so the parent's
 * first render after a swap used stale state). The render-prop computes `resolved` from the current
 * `document` in its own render, so the very next render after the swap is synchronously correct.
 */
export const SwapDocument: Story = {
  render: () => <StorySwap />,
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
