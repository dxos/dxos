//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import { Obj } from '@dxos/echo';
import { type SpaceCapabilities } from '@dxos/plugin-space';
import { Column } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { ThreadCapabilities, buildChannelFormSchema } from '#types';

/**
 * Provider-driven create panel for channels. Reads the registered
 * `ChannelBackend` providers and renders a react-ui-form whose schema is the
 * assembled `{ name?, backend: Union(...) }` — a backend selector plus the
 * selected provider's create fields (just a name field when there is a single
 * field-less provider).
 */
export const ChannelCreatePanel = ({ target, onCreateObject }: SpaceCapabilities.CreateObjectCustomPanelProps) => {
  const providers = useCapabilities(ThreadCapabilities.ChannelBackend);
  const schema = useMemo(() => buildChannelFormSchema(providers), [providers]);

  const handleSave = useCallback(
    (values: { name?: string; backend?: { kind: string } & Record<string, unknown> }) => {
      const { name, backend } = values;
      const { kind, ...options } = backend ?? {};
      void onCreateObject({ name, kind, options });
    },
    [onCreateObject],
  );

  return (
    <Form.Root
      autoFocus
      schema={schema}
      defaultValues={{}}
      db={Obj.isObject(target) ? Obj.getDatabase(target) : target}
      onSave={handleSave}
      testId='create-channel-form'
    >
      <Column.Center>
        <Form.Content>
          <Form.FieldSet />
          <Form.Submit />
        </Form.Content>
      </Column.Center>
    </Form.Root>
  );
};
