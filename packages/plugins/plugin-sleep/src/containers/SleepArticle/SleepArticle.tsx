//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { type JsonPath, splitJsonPath } from '@dxos/effect';
import { Panel } from '@dxos/react-ui';
import { Form, omitId } from '@dxos/react-ui-form';

import { type Dream } from '../../types';

export type SleepArticleProps = SurfaceComponentProps<Dream.Dream>;

export const SleepArticle = ({ role, subject: dream }: SleepArticleProps) => {
  const schema = Obj.getSchema(dream);

  const handleSave = useCallback(
    (values: any, { changed }: { changed: Record<string, boolean> }) => {
      const paths = Object.keys(changed).filter((path) => changed[path]);
      Obj.change(dream, () => {
        for (const path of paths) {
          const value = values[path];
          const parts = splitJsonPath(path as JsonPath);
          Obj.setValue(dream, parts, value);
        }
      });
    },
    [dream],
  );

  if (!schema) {
    return null;
  }

  return (
    <Panel.Root role={role}>
      <Panel.Content classNames='p-4'>
        <Form.Root schema={omitId(schema)} values={dream} autoSave onSave={handleSave}>
          <Form.Viewport>
            <Form.Content>
              <Form.FieldSet />
            </Form.Content>
          </Form.Viewport>
        </Form.Root>
      </Panel.Content>
    </Panel.Root>
  );
};
