//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { type AppSurface, useAppGraph } from '@dxos/app-toolkit/ui';
import { type Node, useActionRunner } from '@dxos/plugin-graph';
import { useObject } from '@dxos/react-client/echo';
import { Panel, useTranslation } from '@dxos/react-ui';
import { type ActionExecutor, type ActionGraphProps, Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';

import { meta } from '../../meta';
import { Provider } from '../../types';

export type ProviderArticleProps = AppSurface.ObjectArticleProps<Provider.Provider>;

/**
 * Article view for a {@link Provider}. The editable template fields live in the properties
 * companion; this surface previews the blueprint-derived search fields (read-only) and exposes the
 * Provider node's graph actions (e.g. Regenerate, which runs the blueprint agent) in the toolbar.
 */
export const ProviderArticle = ({ role, subject, attendableId }: ProviderArticleProps) => {
  const { t } = useTranslation(meta.id);
  const [provider] = useObject(subject);
  const { actions, onAction } = useMenuActions(attendableId);

  // Read-only preview of the blueprint-derived search fields, read directly from the schema's
  // `properties` and rendered as a plain list (a preview, not an editable form). Keyed on the
  // SERIALIZED schema, not the object reference: ECHO keeps the nested `searchSchema` proxy reference
  // stable when a Regenerate (run in another context) populates it, so a reference-keyed memo would
  // never recompute.
  const searchSchema = provider?.searchSchema;
  const searchSchemaKey = JSON.stringify(searchSchema ?? null);
  const searchFields = useMemo(() => {
    const properties = searchSchema?.properties;
    if (!properties) {
      return [];
    }
    return Object.entries(properties).map(([key, value]) => ({
      key,
      title:
        typeof value === 'object' && value !== null && 'title' in value && typeof value.title === 'string'
          ? value.title
          : key,
      type:
        typeof value === 'object' && value !== null && 'type' in value && typeof value.type === 'string'
          ? value.type
          : undefined,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchSchemaKey]);

  if (!provider) {
    return null;
  }

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar>
        <Menu.Root {...actions} attendableId={attendableId} onAction={onAction}>
          <Menu.Toolbar />
        </Menu.Root>
      </Panel.Toolbar>
      <Panel.Content classNames='flex flex-col gap-2 p-3'>
        <span className='text-sm text-description'>{t('search-fields.label')}</span>
        {searchFields.length > 0 ? (
          <dl className='flex flex-col gap-1'>
            {searchFields.map((field) => (
              <div key={field.key} className='flex items-baseline justify-between gap-2'>
                <dt className='text-sm'>{field.title}</dt>
                {field.type && <dd className='text-xs text-description'>{field.type}</dd>}
              </div>
            ))}
          </dl>
        ) : (
          <span className='text-sm text-subdued'>{t('search-fields.message')}</span>
        )}
      </Panel.Content>
    </Panel.Root>
  );
};

//
// Hooks
//

/**
 * Builds toolbar menu actions from the app graph for the Provider node, filtering to
 * `disposition: 'toolbar'` actions and executing them via the graph action runner.
 */
const useMenuActions = (
  attendableId: string | undefined,
): { actions: ReturnType<typeof useMenuBuilder>; onAction: ActionExecutor } => {
  const { graph } = useAppGraph();
  const runAction = useActionRunner();

  const menuActions = useMenuBuilder(
    (get): ActionGraphProps => {
      const actions = attendableId ? get(graph.actions(attendableId)) : [];
      const toolbarActions = actions.filter((action) => action.properties.disposition === 'toolbar');
      return MenuBuilder.make()
        .subgraph({
          nodes: toolbarActions as ActionGraphProps['nodes'],
          edges: toolbarActions.map((node) => ({ source: 'root', target: node.id, relation: 'child' })),
        })
        .build();
    },
    [graph, attendableId],
  );

  const onAction: ActionExecutor = useCallback(
    (action) => {
      // Boundary: the menu's ActionExecutor surfaces a structural menu-action node, while the graph
      // runner needs the nominal `Node.Action`. The objects are the same graph actions the builder
      // produced (filtered to `disposition: 'toolbar'`), so the coercion is safe here.
      void runAction(action as Node.Action, { caller: meta.id });
    },
    [runAction],
  );

  return { actions: menuActions, onAction };
};
