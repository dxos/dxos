//
// Copyright 2026 DXOS.org
//

import { Domino } from '@dxos/ui';
import { type RenderCallback } from '@dxos/ui-editor/types';

import { type VocabularyTooltipProps } from '#extensions';

export type TooltipHandlers = {
  t: (key: string, options?: Record<string, unknown>) => string;
  /** Files the hovered token into the active deck; absent when no deck is selected. */
  onAdd?: (props: VocabularyTooltipProps) => void;
};

/**
 * Builds the hover card as plain DOM rather than a React portal: CodeMirror owns the tooltip's
 * lifetime, and mounting a React root per hover leaks one root per word passed over.
 */
export const createTooltipRenderer =
  ({ t, onAdd }: TooltipHandlers): RenderCallback<VocabularyTooltipProps> =>
  (el, props) => {
    const { token, entry } = props;
    const root = Domino.of('div').classNames('flex flex-col gap-1 p-2 max-w-80');

    root.append(
      Domino.of('span')
        .classNames('font-medium')
        .text(entry?.term ?? token),
    );

    if (entry?.reading) {
      root.append(Domino.of('span').classNames('text-sm opacity-75').text(entry.reading));
    }

    if (entry) {
      root.append(Domino.of('span').text(entry.translation));
      if (entry.partOfSpeech) {
        root.append(Domino.of('span').classNames('text-sm italic opacity-75').text(entry.partOfSpeech));
      }
    } else {
      root.append(Domino.of('span').classNames('text-sm opacity-75').text(t('unknown-word.message')));
    }

    // Offered for unknown tokens only: a term already in the deck has nothing to add.
    if (onAdd && !entry?.wordId) {
      root.append(
        Domino.of('button')
          .classNames('flex items-center gap-2 pt-1 cursor-pointer underline underline-offset-2')
          .text(t('add-word.label'))
          .on('click', () => onAdd(props)),
      );
    }

    el.appendChild(root.root);
  };
