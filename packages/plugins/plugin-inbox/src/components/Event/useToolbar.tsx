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
  /** Promote the event from a companion to the main view (shown only when displayed as a companion). */
  onOpen?: () => void;
  /** Push the (draft) event to Google Calendar (shown only when the event is draft). */
  onSave?: () => void;
  /** Disable the save action (e.g. when no integration is connected to sync against). */
  saveDisabled?: boolean;
  /** Delete the event (locally, and on Google Calendar when synced). */
  onDelete?: () => void;
};

export const useEventToolbarActions = ({
  viewMode,
  setViewMode,
  onNoteCreate,
  onOpen,
  onSave,
  saveDisabled,
  onDelete,
}: UseEventToolbarActionsProps) => {
  return useMenuBuilder(
    () =>
      MenuBuilder.make()
        .root({ label: ['event-toolbar.menu', { ns: meta.id }] })
        .subgraph(
          onOpen &&
            ((b) =>
              b.action(
                'open',
                { label: ['event-toolbar-open.menu', { ns: meta.id }], icon: 'ph--arrow-square-out--regular' },
                onOpen,
              )),
        )
        .subgraph(viewModeGroup({ ns: meta.id, viewMode, setViewMode, modes: ['markdown', 'plain'] }))
        .action(
          'createNote',
          {
            label: ['event-toolbar-create-note.menu', { ns: meta.id }],
            icon: 'ph--note--regular',
          },
          () => onNoteCreate?.(),
        )
        .subgraph(
          onSave &&
            ((b) =>
              b.action(
                'save',
                {
                  label: ['event-toolbar-save.menu', { ns: meta.id }],
                  icon: 'ph--cloud-arrow-up--regular',
                  disabled: saveDisabled,
                },
                onSave,
              )),
        )
        .subgraph(
          onDelete &&
            ((b) =>
              b.action(
                'delete',
                { label: ['event-toolbar-delete.menu', { ns: meta.id }], icon: 'ph--trash--regular' },
                onDelete,
              )),
        )
        .build(),
    [viewMode, setViewMode, onNoteCreate, onOpen, onSave, saveDisabled, onDelete],
  );
};
