//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { Obj } from '@dxos/echo';
import { type JsonPath, splitJsonPath } from '@dxos/echo/internal';
import { Layout } from '@dxos/react-ui';
import { Form, omitId } from '@dxos/react-ui-form';
import { Message } from '@dxos/types';

export type DraftMessageArticleProps = {
  role?: string;
  subject: Message.Message;
};

export const DraftMessageArticle = ({ role, subject }: DraftMessageArticleProps) => {
  const db = Obj.getDatabase(subject);

  const handleValuesChanged = useCallback(
    (values: any, { isValid, changed }: { isValid: boolean; changed: Record<JsonPath, boolean> }) => {
      if (!isValid) {
        return;
      }

      const changedPaths = Object.keys(changed).filter((path) => changed[path as JsonPath]) as JsonPath[];
      if (changedPaths.length > 0) {
        Obj.change(subject, () => {
          for (const path of changedPaths) {
            const parts = splitJsonPath(path);
            const value = Obj.getValue(values, parts);
            Obj.setValue(subject, parts, value);
          }
        });
      }
    },
    [subject],
  );

  return (
    <Layout.Main role={role}>
      {/* TODO(wittjosiah): Replace with draft message UI. */}
      <Form.Root schema={omitId(Message.Message)} values={subject} db={db} onValuesChanged={handleValuesChanged}>
        <Form.Viewport>
          <Form.Content>
            <Form.FieldSet />
          </Form.Content>
        </Form.Viewport>
      </Form.Root>
    </Layout.Main>
  );
};

export default DraftMessageArticle;
