//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Ref, Type } from '@dxos/echo';
import { log } from '@dxos/log';
import { useObject } from '@dxos/react-client/echo';
import { Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { Form, omitId } from '@dxos/react-ui-form';

import { meta } from '../../meta';
import { Provider, SearchOperation } from '../../types';
import { buildUnionFormSchema } from '../../util';

export type ProviderArticleProps = AppSurface.ObjectArticleProps<Provider.Provider>;

/**
 * Article view for editing a {@link Provider} template. The whole template — scalar fields plus
 * the nested `request` / `result` mapping structs — is rendered by a single schema-driven Form;
 * `searchSchema` is blueprint-authored and hidden from the form. A Regenerate toolbar action runs
 * the provider blueprint agent to (re)populate the template, and the derived search fields are
 * shown beneath the form as a read-only preview.
 */
export const ProviderArticle = ({ role, subject }: ProviderArticleProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const [provider] = useObject(subject);

  // Strip `id` from the schema; remaining hidden fields (searchSchema) are omitted via their annotation.
  const schema = useMemo(() => omitId(Type.getSchema(Provider.Provider)), []);

  // Generation progress is ephemeral UI state, not a persisted property on the Provider.
  const [generating, setGenerating] = useState(false);

  const handleRegenerate = useCallback(() => {
    setGenerating(true);
    void invokePromise(SearchOperation.GenerateProviderTemplate, { provider: Ref.make(subject) })
      .catch((err) => log.catch(err))
      .finally(() => setGenerating(false));
  }, [invokePromise, subject]);

  const handleSave = useCallback(
    (values: Omit<Provider.Provider, 'id'>) => {
      Obj.update(subject, (subject) => {
        subject.name = values.name;
        subject.url = values.url;
        subject.kind = values.kind;
        subject.description = values.description;
        subject.enabled = values.enabled;
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
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.IconButton
            label={t('regenerate.label')}
            icon='ph--sparkle--regular'
            iconOnly
            disabled={generating}
            onClick={handleRegenerate}
          />
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content>
        <Form.Root
          schema={schema}
          values={{
            name: provider.name,
            url: provider.url,
            kind: provider.kind,
            description: provider.description,
            enabled: provider.enabled,
            request: provider.request,
            result: provider.result,
          }}
          autoSave
          onSave={handleSave}
        >
          <Form.Content>
            <Form.FieldSet />
          </Form.Content>
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
