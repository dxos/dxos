//
// Copyright 2025 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import { useCallback, useMemo, useRef } from 'react';

import { Domino, toLocalizedString, useTranslation } from '@dxos/react-ui';
import {
  type PopoverMenuGroup,
  type UsePopoverMenuProps,
  filterMenuGroups,
  formattingCommands,
  linkSlashCommands,
} from '@dxos/react-ui-editor';

import { meta } from '../meta';

export type UsePopoverMenuOptionsProps = {
  editorView?: EditorView;
  slashCommandGroups?: PopoverMenuGroup[];
  onLinkQuery?: (query?: string) => Promise<PopoverMenuGroup[]>;
};

export const usePopoverMenuOptions = ({
  editorView,
  slashCommandGroups,
  onLinkQuery,
}: UsePopoverMenuOptionsProps): UsePopoverMenuProps => {
  const { t } = useTranslation(meta.id);

  const getMenu = useCallback<NonNullable<UsePopoverMenuProps['getMenu']>>(
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
  return useMemo<UsePopoverMenuProps>(() => {
    const trigger = onLinkQuery ? ['/', '@'] : ['/'];
    const placeholder = {
      delay: 3_000,
      content: () =>
        Domino.of('div')
          .children(
            Domino.of('span').text('Press'),
            ...trigger.map((text) =>
              Domino.of('span')
                .classNames('mx-1 px-1.5 pt-[1px] pb-[2px] border border-separator rounded-sm')
                .text(text),
            ),
            Domino.of('span').text('for commands.'),
          )
          .build(),
    };

    return { viewRef, getMenu, trigger, placeholder };
  }, [getMenu, onLinkQuery]);
};
