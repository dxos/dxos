//
// Copyright 2025 DXOS.org
//

import { type Graph, type Node } from '@dxos/app-graph';
import { MenuBuilder, graphActions, useMenuBuilder } from '@dxos/react-ui-menu';

import { meta } from '#meta';

import { type ViewMode, viewModeGroup } from '../ViewMode';

/** Contributed actions opt into the toolbar via `disposition: 'toolbar'` (vs context-menu-only). */
const isToolbarAction = (action: Node.ActionLike) => action.properties.disposition === 'toolbar';

export type UseEventToolbarActionsProps = {
  /** App graph used to source contributed (`disposition: 'toolbar'`) actions; omitted outside a plugin context. */
  graph?: Graph.ReadableGraph;
  /** Graph node id of the event (its URI / attendableId); contributed actions hang off this. */
  nodeId?: string;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  /** Promote the event from a companion to the main view (shown only when displayed as a companion). */
  onOpen?: () => void;
  /** Push the (draft) event to Google Calendar (shown only when the event is draft). */
  onSave?: () => void;
  /** Disable the save action (e.g. when no integration is connected to sync against). */
  saveDisabled?: boolean;
  /** Delete the event (locally, and on Google Calendar when synced). */
  onDelete?: () => void;
  /** Editing (draft) mode — disables the open + view-mode actions (irrelevant while editing). */
  editing?: boolean;
};

/**
 * Builds the Event toolbar menu: open · view-mode toggle · contributed graph actions · save · delete
 * (in an overflow menu). While `editing`, the open and view-mode actions are disabled.
 */
export const useEventToolbarActions = ({
  graph,
  nodeId,
  viewMode,
  setViewMode,
  onOpen,
  onSave,
  saveDisabled,
  onDelete,
  editing,
}: UseEventToolbarActionsProps) => {
  return useMenuBuilder(
    (get) =>
      MenuBuilder.make()
        .root({ label: ['event-toolbar.menu', { ns: meta.id }] })
        .subgraph(
          onOpen &&
            ((b) =>
              b.action(
                'open',
                {
                  label: ['event-toolbar-open.menu', { ns: meta.id }],
                  icon: 'ph--arrow-square-out--regular',
                  disabled: editing,
                },
                onOpen,
              )),
        )
        .subgraph(
          viewModeGroup({ ns: meta.id, viewMode, setViewMode, modes: ['markdown', 'plain'], disabled: editing }),
        )
        // Actions other plugins contribute onto the event node (e.g. plugin-meeting's create/open meeting).
        .subgraph(graphActions(graph, get, nodeId, { filter: isToolbarAction }))
        .separator()
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
              b.group(
                'more',
                {
                  label: ['event-toolbar-more.menu', { ns: meta.id }],
                  icon: 'ph--dots-three-vertical--regular',
                  iconOnly: true,
                  variant: 'dropdownMenu',
                  caretDown: false,
                },
                (group) =>
                  group.action(
                    'delete',
                    { label: ['event-toolbar-delete.menu', { ns: meta.id }], icon: 'ph--trash--regular' },
                    onDelete,
                  ),
              )),
        )
        .build(),
    [graph, nodeId, viewMode, setViewMode, onOpen, onSave, saveDisabled, onDelete, editing],
  );
};
