//
// Copyright 2026 DXOS.org
//

import { Domino } from '@dxos/ui';
import { type RenderCallback } from '@dxos/ui-editor/types';

import { type SegmentTooltipProps } from './segments';

export type TooltipHandlers = {
  t: (key: string, options?: Record<string, unknown>) => string;
  /** Files the hovered segment into the active deck; absent when no deck is selected. */
  onAdd?: (props: SegmentTooltipProps) => void;
};

/**
 * Builds the hover card as plain DOM rather than a React portal: CodeMirror owns the tooltip's
 * lifetime, and mounting a React root per hover leaks one root per region passed over.
 */
export const createTooltipRenderer =
  ({ t, onAdd }: TooltipHandlers): RenderCallback<SegmentTooltipProps> =>
  (el, props) => {
    const { segment, text } = props;
    const root = Domino.of('div').classNames('flex flex-col gap-1 p-2 max-w-80');

    root.append(Domino.of('span').classNames('font-medium').text(text));

    if (segment.reading) {
      root.append(Domino.of('span').classNames('text-sm opacity-75').text(segment.reading));
    }

    if (segment.gloss) {
      root.append(Domino.of('span').text(segment.gloss));
    } else {
      root.append(Domino.of('span').classNames('text-sm opacity-75').text(t('unknown-word.message')));
    }

    // A coarse region names itself, so the learner can tell what the outline is addressing.
    if (segment.kind !== 'vocab') {
      root.append(
        Domino.of('span')
          .classNames('text-sm italic opacity-75')
          .text(t(`segment-${segment.kind}.label`)),
      );
    }

    if (onAdd) {
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
          // `mousedown` rather than `click`, and prevented: the tooltip sits over the editor, so a
          // click would move the selection out from under the segment the button acts on.
          .on('mousedown', (event) => {
            event.preventDefault();
            onAdd(props);
          }),
      );
    }

    el.appendChild(root.root);
  };
