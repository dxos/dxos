//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Format } from '@dxos/echo';
import { Dialog, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '../../meta';
import { JournalOperation } from '../../types';

const QuickEntryForm = Schema.Struct({
  text: Schema.String.pipe(
    Format.FormatAnnotation.set(Format.TypeFormat.Markdown),
    Schema.annotations({ description: 'Journal entry' }),
  ),
});

type QuickEntryForm = Schema.Schema.Type<typeof QuickEntryForm>;

export const QuickEntryDialog = () => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();

  const handleSave = useCallback(
    async (values: QuickEntryForm) => {
      if (!values.text.trim()) {
        return;
      }

      await invokePromise(JournalOperation.QuickEntry, { text: values.text.trim() });
      await invokePromise(LayoutOperation.UpdateDialog, { state: false });
    },
    [invokePromise],
  );

  const handleCancel = useCallback(async () => {
    await invokePromise(LayoutOperation.UpdateDialog, { state: false });
  }, [invokePromise]);

  return (
    <Dialog.Content>
      <Dialog.Title srOnly>{t('quick entry dialog title')}</Dialog.Title>
      <Form.Root
        autoFocus
        schema={QuickEntryForm}
        defaultValues={{ text: '' }}
        onSave={handleSave}
        onCancel={handleCancel}
      >
        <Form.Viewport>
          <Form.Content>
            <Form.FieldSet />
            <Form.Actions />
          </Form.Content>
        </Form.Viewport>
      </Form.Root>
    </Dialog.Content>
  );
};
