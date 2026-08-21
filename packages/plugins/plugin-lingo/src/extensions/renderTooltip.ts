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
        Domino.of('div')
          .classNames('flex items-center gap-2 pt-1')
          .append(
            Domino.of('button')
              .classNames('flex items-center p-1 rounded text-description hover:text-accent-text cursor-pointer')
              // `mousedown` rather than `click`, and prevented: the tooltip sits over the editor, so a
              // click would move the selection out from under the segment the button acts on.
              .attributes({ 'type': 'button', 'aria-label': label, 'title': label })
              .append(Domino.svg('ph--plus--regular').classNames('shrink-0 w-4 h-4'))
              .on('mousedown', (event) => {
                event.preventDefault();
                onAdd(props);
              }),
          )
          .append(Domino.of('span').classNames('text-sm opacity-75').text(label)),
      );
    }

    el.appendChild(root.root);
  };
