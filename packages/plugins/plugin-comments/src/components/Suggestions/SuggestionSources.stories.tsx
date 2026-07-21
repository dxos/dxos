//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';
import { expect, fn, waitFor } from 'storybook/test';

import { invariant } from '@dxos/invariant';
import { Markdown } from '@dxos/plugin-markdown';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { Loading, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';

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
