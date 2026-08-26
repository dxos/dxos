//
// Copyright 2026 DXOS.org
//

import { Domino } from '@dxos/ui';
import { type RenderCallback } from '@dxos/ui-editor/types';

import { type VocabularyLookup, normalizeToken } from './deck-segments';
import { type SegmentTooltipProps } from './segments';

export type TooltipHandlers = {
  t: (key: string, options?: Record<string, unknown>) => string;
  /** Files the hovered segment into the active deck; absent when no deck is selected. */
  onAdd?: (props: SegmentTooltipProps) => void;
  /**
   * The deck's terms. A segment already held has nothing to add, so the action is withheld — the
   * analysis alone cannot answer this, since a merged analyzed segment looks identical to a new one.
   */
  lookup?: VocabularyLookup;
};

/**
 * Builds the hover card as plain DOM rather than a React portal: CodeMirror owns the tooltip's
 * lifetime, and mounting a React root per hover leaks one root per region passed over.
 */
/**
 * Strips inline markdown from a quoted span.
 *
 * The text is sliced from the document, not from the rendered view, so a term inside emphasis
 * arrives as `**パン屋**`. Deliberately syntax-only -- the span is a fragment, so parsing it as
 * markdown would be heavier and no more correct.
 */
const plain = (text: string): string =>
  text
    .replace(/^#{1,6}\s+/, '')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');

export const createTooltipRenderer =
  ({ t, onAdd, lookup }: TooltipHandlers): RenderCallback<SegmentTooltipProps> =>
  (el, props) => {
    const { segment, text } = props;
    const root = Domino.of('div').classNames('flex flex-col gap-1 p-2 max-w-80');

    root.append(Domino.of('span').classNames('font-medium text-accent-text').text(plain(text)));

    if (segment.reading) {
      root.append(Domino.of('span').classNames('text-sm opacity-75').text(segment.reading));
    }

    if (segment.gloss) {
      root.append(Domino.of('span').text(segment.gloss));
    }

    // `plain` first, as the label above does: the deck holds `パン屋`, not `**パン屋**`, so looking up
    // the raw markdown offers to add a term that is already there.
    if (onAdd && !lookup?.(normalizeToken(plain(text)))?.wordId) {
      const label = t(segment.kind === 'vocab' ? 'add-word.label' : 'add-phrase.label');
      root.append(
        Domino.of('button')
          // The class list `IconButton` emits for a labelled ghost button (`buttonTheme.root` plus
          // `iconButtonTheme.root`'s non-icon-only gap); geometry comes from the density knobs on
          // `.dx-button`, so no padding utility belongs here.
          .classNames('dx-button dx-focus-ring group gap-1 [&_span]:truncate', 'gap-1.5', 'mt-1 self-start')
          .attributes({ 'type': 'button', 'data-variant': 'ghost', 'aria-label': label })
          .append(Domino.svg('ph--plus--regular'))
          .append(Domino.of('span').text(label))
          // `mousedown` is prevented but does NOT act: the tooltip sits over the editor, so letting
          // the press through would move the selection out from under the segment the button acts on.
          // Acting on `click` instead is what makes the button work from the keyboard, which fires
          // `click` alone.
          .on('mousedown', (event) => {
            event.preventDefault();
          })
          .on('click', () => onAdd(props)),
      );
    }

    el.appendChild(root.root);
  };
