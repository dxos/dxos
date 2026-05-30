//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Type } from '@dxos/echo';
import { useObject } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';
import { Form, omitId } from '@dxos/react-ui-form';

import { Provider } from '../../types';

export type ProviderArticleProps = AppSurface.ObjectArticleProps<Provider.Provider>;

/**
 * Article view for editing a {@link Provider} template. The whole template — scalar fields plus
 * the nested `request` / `result` mapping structs — is rendered by a single schema-driven Form;
 * `searchSchema` is blueprint-authored and hidden from the form.
 */
export const ProviderArticle = ({ role, subject }: ProviderArticleProps) => {
  const [provider] = useObject(subject);

  // Strip `id` from the schema; remaining hidden fields (searchSchema) are omitted via their annotation.
  const schema = useMemo(() => omitId(Type.getSchema(Provider.Provider)), []);

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

  if (!provider) {
    return null;
  }

  return (
    <Panel.Root role={role}>
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
      </Panel.Content>
    </Panel.Root>
  );
};
