//
// Copyright 2025 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import { useCallback, useMemo, useRef } from 'react';

import {
  type EditorMenuGroup,
  type UseEditorMenuProps,
  filterMenuGroups,
  formattingCommands,
  linkSlashCommands,
} from '@dxos/react-ui-editor';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Theme from '@dxos/react-ui/Theme';
import { Domino } from '@dxos/ui';

import { MarkdownNamespace } from '../namespace.ts';

export type UseEditorMenuOptionsProps = {
  editorView?: EditorView;
  slashCommandGroups?: EditorMenuGroup[];
  onLinkQuery?: (query?: string) => Promise<EditorMenuGroup[]>;
};

export const useEditorMenuOptions = ({
  editorView,
  slashCommandGroups,
  onLinkQuery,
}: UseEditorMenuOptionsProps): UseEditorMenuProps => {
  const { t } = Hooks.useTranslation(MarkdownNamespace.key);

  const getMenu = useCallback<NonNullable<UseEditorMenuProps['getMenu']>>(
    ({ text, trigger }) => {
      switch (trigger) {
        case '@': {
          return onLinkQuery?.(text) ?? [];
        }

        case '/':
        default: {
          return filterMenuGroups([linkSlashCommands, formattingCommands, ...(slashCommandGroups ?? [])], (item) =>
            text ? Theme.toLocalizedString(item.label, t).toLowerCase().includes(text.toLowerCase()) : true,
          );
        }
      }
    },
    [slashCommandGroups, onLinkQuery],
  );

  const viewRef = useRef(editorView);
  return useMemo<UseEditorMenuProps>(() => {
    const trigger = onLinkQuery ? ['/', '@'] : ['/'];
    const placeholder = {
      delay: 3_000,
      content: () => {
        const pressEl = Domino.of('span').text('Press');
        const triggerEls = trigger.map((text) =>
          Domino.of('span').classNames('mx-1 px-1.5 pt-[1px] pb-[2px] border border-separator rounded-xs').text(text),
        );
        const forCommandsEl = Domino.of('span').text('for commands.');
        return Domino.of('div').append(pressEl, ...triggerEls, forCommandsEl).root;
      },
    };

    // Object names hold spaces, so a link query (or a new object's name) runs on past one.
    return { viewRef, getMenu, trigger, placeholder, multiWordTriggers: ['@'] };
  }, [getMenu, onLinkQuery]);
};
