//
// Copyright 2025 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import { useCallback, useMemo, useRef } from 'react';

import { toLocalizedString, useTranslation } from '@dxos/react-ui';
import {
  type EditorMenuGroup,
  type UseEditorMenuProps,
  filterMenuGroups,
  formattingCommands,
  linkSlashCommands,
} from '@dxos/react-ui-editor';
import { $ } from '@dxos/ui';

import { meta } from '../meta';

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
  const { t } = useTranslation(meta.id);

  const getMenu = useCallback<NonNullable<UseEditorMenuProps['getMenu']>>(
    ({ text, trigger }) => {
      switch (trigger) {
        case '@': {
          return onLinkQuery?.(text) ?? [];
        }

        case '/':
        default: {
          return filterMenuGroups([formattingCommands, linkSlashCommands, ...(slashCommandGroups ?? [])], (item) =>
            text ? toLocalizedString(item.label, t).toLowerCase().includes(text.toLowerCase()) : true,
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
        const pressEl = $('<span>').text('Press').get(0)!;
        const triggerEls = trigger.map(
          (text) =>
            $('<span>')
              .addClass('mx-1 pli-1.5 pt-[1px] pb-[2px] border border-separator rounded-sm')
              .text(text)
              .get(0)!,
        );
        const forCommandsEl = $('<span>').text('for commands.').get(0)!;
        return $('<div>')
          .append([pressEl, ...triggerEls, forCommandsEl])
          .get(0)!;
      },
    };

    return { viewRef, getMenu, trigger, placeholder };
  }, [getMenu, onLinkQuery]);
};
