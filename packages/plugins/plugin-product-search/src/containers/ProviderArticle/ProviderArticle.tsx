//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { type AppSurface, useAppGraph } from '@dxos/app-toolkit/ui';
import { Obj, Type } from '@dxos/echo';
import { type Node, useActionRunner } from '@dxos/plugin-graph';
import { useObject } from '@dxos/react-client/echo';
import { Panel, useTranslation } from '@dxos/react-ui';
import { Form, omitId } from '@dxos/react-ui-form';
import { type ActionExecutor, type ActionGraphProps, Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';

import { meta } from '../../meta';
import { Provider } from '../../types';
import { buildUnionFormSchema } from '../../util';

export type ProviderArticleProps = AppSurface.ObjectArticleProps<Provider.Provider>;

/**
 * Article view for editing a {@link Provider} template. The whole template — scalar fields plus
 * the nested `request` / `result` mapping structs — is rendered by a single schema-driven Form;
 * `searchSchema` is blueprint-authored and hidden from the form. The toolbar surfaces the Provider
 * node's graph actions (e.g. Regenerate, which runs the blueprint agent), and the derived search
 * fields are shown beneath the form as a read-only preview.
 */
export const ProviderArticle = ({ role, subject, attendableId }: ProviderArticleProps) => {
  const { t } = useTranslation(meta.id);
  const [provider] = useObject(subject);
  const { actions, onAction } = useMenuActions(attendableId);

  // Strip `id` from the schema; remaining hidden fields (searchSchema) are omitted via their annotation.
  const schema = useMemo(() => omitId(Type.getSchema(Provider.Provider)), []);

  const handleSave = useCallback(
    (values: Omit<Provider.Provider, 'id'>) => {
      Obj.update(subject, (subject) => {
        subject.name = values.name;
        subject.url = values.url;
        subject.kind = values.kind;
        subject.description = values.description;
        subject.request = values.request;
        subject.result = values.result;
      });
    },
    [subject],
  );

  // Read-only preview of the blueprint-derived search fields.
  const searchSchema = provider?.searchSchema;
  const searchFieldsSchema = useMemo(() => {
    const properties = searchSchema?.properties;
    if (properties == null || Object.keys(properties).length === 0) {
      return undefined;
    }
    return buildUnionFormSchema([searchSchema]);
  }, [searchSchema]);

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
      <Panel.Content classNames='grid grid-cols-2'>
        <Form.Root schema={schema} defaultValues={provider} autoSave onSave={handleSave}>
          <Form.Viewport>
            <Form.Content>
              <Form.FieldSet />
            </Form.Content>
          </Form.Viewport>
        </Form.Root>

        <div className='flex flex-col gap-1 p-3'>
          <span className='text-sm text-description'>{t('search-fields.label')}</span>
          {searchFieldsSchema ? (
            <Form.Root key={JSON.stringify(provider.searchSchema)} schema={searchFieldsSchema} values={{}} readonly>
              <Form.Content>
                <Form.FieldSet />
              </Form.Content>
            </Form.Root>
          ) : (
            <span className='text-sm text-subdued'>{t('search-fields.message')}</span>
          )}
        </div>
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
      void runAction(action as Node.Action, { caller: meta.id });
    },
    [runAction],
  );

  return { actions: menuActions, onAction };
};
