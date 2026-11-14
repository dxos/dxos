//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import { EDITOR_TOOLBAR_INSERT_GROUP, createEditorToolbarActions, useEditorContext } from '@dxos/react-ui-editor';
import {
  type ActionGraphProps,
  MenuBuilder,
  type ToolbarMenuActionGroupProperties,
  graphActions,
  isToolbarAction,
} from '@dxos/react-ui-menu';
import { type EditorViewMode } from '@dxos/ui-editor/types';

import { runSlashCommand, slashCommandsOf } from '../components/SpecDocumentEditor/slash-commands.ts';
import { ProjectsNamespace } from '../namespace.ts';

/** Fills the host's toolbar with a section's actions; the returned function takes them back out. */
type SpecToolbarSlot = (actions: Atom.Atom<ActionGraphProps>) => () => void;

const SpecToolbarContext = createContext<SpecToolbarSlot | undefined>(undefined);

/** Gives a spec section inside it the host's toolbar for its editor's tools, so the section draws none of its own. */
export const SpecToolbarProvider = SpecToolbarContext.Provider;

const NO_ACTIONS = Atom.make<ActionGraphProps>({ nodes: [], edges: [] });

/** The host's side of {@link useSpecToolbar}: the slot to provide, and the actions a section filled it with. */
export const useSpecToolbarSlot = () => {
  const [actions, setActions] = useState<Atom.Atom<ActionGraphProps>>();
  const slot = useCallback<SpecToolbarSlot>((next) => {
    setActions(() => next);
    // A section mounting in the same commit may have filled it already.
    return () => setActions((current) => (current === next ? undefined : current));
  }, []);

  return { slot, actions: useAtomValue(actions ?? NO_ACTIONS) };
};

export type UseSpecToolbarProps = {
  /** The node whose toolbar actions (such as commenting) join the editor's. */
  attendableId?: string;
  onViewModeChange?: (mode: EditorViewMode) => void;
};

/**
 * Puts the editor's tools in the toolbar of the host the spec is drawn in, as Format and Insert groups with the spec's
 * block kinds among the inserts. Inside an `Editor.Root`; answers whether there is a host, since a section with
 * none draws its own toolbar.
 */
export const useSpecToolbar = ({ attendableId, onViewModeChange }: UseSpecToolbarProps): boolean => {
  const slot = useContext(SpecToolbarContext);
  const { controller, state } = useEditorContext('useSpecToolbar');
  const { graph } = ToolkitHooks.useAppGraph();
  const view = controller?.view;

  const actions = useMemo(() => {
    if (!slot || !view) {
      return undefined;
    }

    return createEditorToolbarActions({
      state,
      getView: () => view,
      onViewModeChange,
      customActions: Atom.make((get) => {
        const { blankLine } = get(state);
        const commands = slashCommandsOf(view.state);
        return MenuBuilder.make()
          .subgraph(attendableId !== undefined && graphActions(graph, get, attendableId, { filter: isToolbarAction }))
          .subgraph(
            commands.length > 0 &&
              MenuBuilder.extend(EDITOR_TOOLBAR_INSERT_GROUP, (group) =>
                group.group(
                  'spec-block',
                  {
                    label: ['spec-block.label', { ns: ProjectsNamespace.key }],
                    icon: 'ph--cube--regular',
                    // A block replaces the line it lands on, so it is offered on a blank one, as a table is.
                    disabled: !blankLine,
                    testId: 'projectsPlugin.insertSpecBlock',
                    variant: 'dropdownMenu',
                  } as ToolbarMenuActionGroupProperties,
                  (blocks) => {
                    for (const command of [...commands].sort((a, b) => a.name.localeCompare(b.name))) {
                      blocks.action(
                        `spec-block--${command.name}`,
                        { label: command.name, icon: command.icon, testId: `projectsPlugin.insert.${command.name}` },
                        () => runSlashCommand(view, command),
                      );
                    }
                  },
                ),
              ),
          )
          .build();
      }),
    });
  }, [slot, view, state, graph, attendableId, onViewModeChange]);

  useEffect(() => (slot && actions ? slot(actions) : undefined), [slot, actions]);

  return slot !== undefined;
};
