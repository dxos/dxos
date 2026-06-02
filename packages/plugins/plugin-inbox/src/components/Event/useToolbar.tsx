//
// Copyright 2025 DXOS.org
//

import { MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';

import { meta } from '#meta';

import { type ViewMode, viewModeGroup } from '../ViewMode';

export type UseEventToolbarActionsProps = {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  onNoteCreate?: () => void;
};

export const useEventToolbarActions = ({ viewMode, setViewMode, onNoteCreate }: UseEventToolbarActionsProps) => {
  return useMenuBuilder(
    () =>
      MenuBuilder.make()
        .root({ label: ['event-toolbar.menu', { ns: meta.id }] })
        .subgraph(viewModeGroup({ ns: meta.id, viewMode, setViewMode, modes: ['markdown', 'plain'] }))
        .action(
          'createNote',
          {
            label: ['event-toolbar-create-note.menu', { ns: meta.id }],
            icon: 'ph--note--regular',
          },
          () => onNoteCreate?.(),
        )
        .build(),
    [viewMode, setViewMode, onNoteCreate],
  );
};
