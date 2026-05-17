//
// Copyright 2025 DXOS.org
//

import { MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';

import { meta } from '#meta';

export type UseEventToolbarActionsProps = {
  onNoteCreate?: () => void;
};

export const useEventToolbarActions = ({ onNoteCreate }: UseEventToolbarActionsProps) => {
  return useMenuBuilder(
    () =>
      MenuBuilder.make()
        .root({ label: ['event-toolbar.menu', { ns: meta.id }] })
        .action(
          'createNote',
          {
            label: ['event-toolbar-create-note.menu', { ns: meta.id }],
            icon: 'ph--note--regular',
          },
          () => onNoteCreate?.(),
        )
        .separator('gap')
        .build(),
    [onNoteCreate],
  );
};
