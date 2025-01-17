//
// Copyright 2024 DXOS.org
//

import { untracked } from '@preact/signals-core';
import React, { useCallback, useMemo } from 'react';

import { ObjectMetaSchema, type S } from '@dxos/echo-schema';
import { getMeta, type ReactiveEchoObject } from '@dxos/react-client/echo';
import { Form } from '@dxos/react-ui-form';

// TODO(wittjosiah): Reconcile w/ schemas from echo-schema.
//   Form needs to support arrays where values aren't all optional.

type Values = S.Schema.Type<typeof ObjectMetaSchema>;

export type AdvancedObjectSettingsProps = {
  object: ReactiveEchoObject<any>;
};

export const AdvancedObjectSettings = ({ object }: AdvancedObjectSettingsProps) => {
  const initialValues = useMemo(() => untracked(() => ({ keys: [...getMeta(object).keys] })), [object]);
  const handleSave = useCallback(
    (values: Values) => {
      const meta = getMeta(object);
      values.keys.forEach((key, index) => {
        const existingKey = meta.keys[index];
        if (!existingKey) {
          meta.keys.push(key);
          return;
        }

        if (existingKey.id !== key.id) {
          existingKey.id = key.id;
        }

        if (existingKey.source !== key.source) {
          existingKey.source = key.source;
        }
      });
    },
    [object],
  );

  // TODO(wittjosiah): This should be wrapped in an "Advanced" accordion.
  return <Form autoSave schema={ObjectMetaSchema} values={initialValues} onSave={handleSave} />;
};
