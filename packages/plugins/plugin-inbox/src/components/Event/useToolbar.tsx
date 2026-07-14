//
// Copyright 2025 DXOS.org
//

import { type Graph } from '@dxos/app-graph';
import { MenuBuilder, graphActions, isToolbarAction, useMenuBuilder } from '@dxos/react-ui-menu';

import { meta } from '#meta';

import { deleteAction, openGroup } from '../Toolbar';
import { type ViewMode, viewModeGroup } from '../ViewMode';

export type UseEventToolbarActionsProps = {
  /** App graph used to source contributed (`disposition: 'toolbar'`) actions; omitted outside a plugin context. */
  graph?: Graph.ReadableGraph;
  /** Graph node id of the event (its URI / attendableId); contributed actions hang off this. */
  nodeId?: string;
  /** Editing (draft) mode — disables the open + view-mode actions (irrelevant while editing). */
  editing?: boolean;
  /** Disable the save action (e.g. when no integration is connected to sync against). */
  saveDisabled?: boolean;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  /** Promote the event from a companion to the main view (shown only when displayed as a companion). */
  onOpen?: () => void;
  /** Push the (draft) event to Google Calendar (shown only when the event is draft). */
  onSave?: () => void;
  /** Delete the event (locally, and on Google Calendar when synced). */
  onDelete?: () => void;
};

/**
 * Builds the Event toolbar menu: open · view-mode toggle · contributed graph actions · save · delete
 * (in an overflow menu). While `editing`, the open and view-mode actions are disabled.
 */
export const useEventToolbarActions = ({
  graph,
  viewMode,
  editing,
  saveDisabled,
  nodeId,
  setViewMode,
  onOpen,
  onSave,
  onDelete,
}: UseEventToolbarActionsProps) => {
  return useMenuBuilder(
    (get) =>
      MenuBuilder.make()
        .root({ label: ['event-toolbar.menu', { ns: meta.profile.key }] })
        .subgraph(
          onOpen && openGroup({ ns: meta.profile.key, labelKey: 'event-toolbar-open.menu', onOpen, disabled: editing }),
        )
        .subgraph(
          viewModeGroup({
            ns: meta.profile.key,
            viewMode,
            setViewMode,
            modes: ['markdown', 'plain'],
            disabled: editing,
          }),
        )
        .separator()
        .menu('more', (b) => {
          // Actions contributed by other plugins.
          b.subgraph(graphActions(graph, get, nodeId, { filter: isToolbarAction, rootId: 'more' }));

          if (onSave) {
            b.action(
              'save',
              {
                label: ['event-toolbar-save.menu', { ns: meta.profile.key }],
                icon: 'ph--cloud-arrow-up--regular',
                disabled: saveDisabled,
              },
              onSave,
            );
          }

          if (onDelete) {
            deleteAction(b, { ns: meta.profile.key, labelKey: 'event-toolbar-delete.menu', onDelete });
          }
        })
        .build(),
    [graph, nodeId, viewMode, saveDisabled, editing, setViewMode, onOpen, onSave, onDelete],
  );
};
