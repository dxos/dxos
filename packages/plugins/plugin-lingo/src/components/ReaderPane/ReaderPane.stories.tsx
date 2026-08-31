//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useMemo, useState } from 'react';
import { expect, waitFor } from 'storybook/test';

import { useTranslation } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import {
  type VocabularyEntry,
  type VocabularyLookup,
  createTooltipRenderer,
  deckSegments,
  normalizeToken,
} from '#extensions';
import { meta as pluginMeta } from '#meta';
import { translations } from '#translations';

import { PAIRED_ANALYSIS, TEST_PASSAGE, TEST_PASSAGE_TRANSLATION, makeTestDeck } from '../../testing';
import { ReaderPane } from './ReaderPane';

/** The split view in miniature: two panes over one analysis, sharing a selection. */
const ReaderPaneStory = ({ paired = false }: { paired?: boolean }) => {
  const { t } = useTranslation(pluginMeta.profile.key);
  const [selected, setSelected] = useState<string>();

  const lookup = useMemo<VocabularyLookup>(() => {
    const { words } = makeTestDeck();
    const index = new Map<string, VocabularyEntry>(
      words.map((word) => [
        normalizeToken(word.term),
        {
          term: word.term,
          translation: word.translation,
          reading: word.reading,
          partOfSpeech: word.partOfSpeech,
          wordId: word.id,
        },
      ]),
    );
    return (token) => index.get(token);
  }, []);

  // The deck pass is deterministic, so this story exercises segments without a model. The paired
  // variant adds the analysis a model would produce, including target ranges.
  const analysis = useMemo(
    () => (paired ? PAIRED_ANALYSIS : deckSegments(TEST_PASSAGE, lookup, 'ja')),
    [paired, lookup],
  );

  // The popover is only registered when `render` is supplied; without it that path is never
  // exercised.
  const render = useMemo(
    () => createTooltipRenderer({ t, lookup, onAdd: ({ text }) => console.log('add', text) }),
    [t, lookup],
  );

  const handleSelect = useCallback((segment?: { id: string }) => setSelected(segment?.id), []);
  const paneProps = { analysis, selected, render, onSelect: handleSelect };

  // `documentSlots` sizes the editor from its container, so a bare pane collapses to zero width.
  if (!paired) {
    return (
      <div className='dx-expand px-2'>
        <ReaderPane {...paneProps} content={TEST_PASSAGE} classNames='h-full' />
      </div>
    );
  }

  return (
    <div className='dx-expand grid grid-cols-2 gap-2 px-2'>
      <ReaderPane {...paneProps} side='source' content={TEST_PASSAGE} classNames='h-full' />
      <ReaderPane {...paneProps} side='target' content={TEST_PASSAGE_TRANSLATION} classNames='h-full' />
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-lingo/components/ReaderPane',
  render: (args: { paired?: boolean }) => <ReaderPaneStory {...args} />,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen', translations },
} satisfies Meta<{ paired?: boolean }>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Pointer position, in the coordinate frame CodeMirror reads. Synthetic events must carry real
 * client coordinates: `posAtCoords` maps pixels to a document offset, so an event without them
 * resolves to nothing and the interaction silently no-ops.
 */
const centreOf = (element: Element) => {
  const rect = element.getBoundingClientRect();
  return { clientX: rect.x + rect.width / 2, clientY: rect.y + rect.height / 2, bubbles: true };
};

const segmentNamed = (canvasElement: HTMLElement, text: string, pane = 0) => {
  const editors = canvasElement.querySelectorAll('.cm-content');
  const found = [...editors[pane].querySelectorAll('span')].find((span) => span.textContent === text);
  if (!found) {
    throw new Error(`No span for "${text}" in pane ${pane}.`);
  }
  return found;
};

const hover = (element: Element) => element.dispatchEvent(new MouseEvent('mousemove', centreOf(element)));
const press = (element: Element) => element.dispatchEvent(new MouseEvent('mousedown', centreOf(element)));

export const Default: Story = {};

export const Paired: Story = { args: { paired: true } };

/** Hovering outlines the most specific region under the pointer; clicking commits it. */
export const HoverAndSelect: Story = {
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelectorAll('.cm-segment-vocab').length).toBeGreaterThan(0), {
      timeout: 10_000,
    });

    const term = segmentNamed(canvasElement, 'パン屋');
    hover(term);
    await waitFor(() => expect(canvasElement.querySelector('.cm-segment-hover')).toHaveTextContent('パン屋'));

    // Nothing is committed until the click: hovering alone must not select.
    await expect(canvasElement.querySelector('.cm-segment-selected')).toBeNull();

    press(term);
    await waitFor(() => expect(canvasElement.querySelector('.cm-segment-selected')).toHaveTextContent('パン屋'));

    // The selection survives the pointer moving on — that is what makes it a selection rather than
    // a hover state, and what lets the toolbar act on it.
    const other = segmentNamed(canvasElement, '小麦粉');
    hover(other);
    await waitFor(() => expect(canvasElement.querySelector('.cm-segment-hover')).toHaveTextContent('小麦粉'));
    await expect(canvasElement.querySelector('.cm-segment-selected')).toHaveTextContent('パン屋');
  },
};

/** The most specific region wins: a vocab term nested in a clause beats the clause. */
export const MostSpecificWins: Story = {
  args: { paired: true },
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelectorAll('.cm-content').length).toBe(2), { timeout: 10_000 });

    // 夜明け is a vocab segment inside the clause 夜明け前に; the clause is only reached off the term.
    press(segmentNamed(canvasElement, '夜明け'));
    await waitFor(() => expect(canvasElement.querySelector('.cm-segment-selected')).toHaveTextContent('夜明け'));
    await expect(canvasElement.querySelector('.cm-segment-selected')).not.toHaveTextContent('前に');
  },
};

/** Selecting in one pane addresses the corresponding text in the other. */
export const SelectionMirrorsAcrossPanes: Story = {
  args: { paired: true },
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelectorAll('.cm-content').length).toBe(2), { timeout: 10_000 });

    press(segmentNamed(canvasElement, '小麦粉'));
    await waitFor(async () => {
      const selected = [...canvasElement.querySelectorAll('.cm-segment-selected')].map((el) => el.textContent);
      // Source pane shows the term; the translation pane shows its counterpart, from the same id.
      await expect(selected).toEqual(['小麦粉', 'flour']);
    });
  },
};
