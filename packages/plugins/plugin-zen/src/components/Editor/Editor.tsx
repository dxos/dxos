//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { type JsonPath, splitJsonPath } from '@dxos/effect';
import { Panel } from '@dxos/react-ui';
import { Form, omitId } from '@dxos/react-ui-form';

import { type Dream } from '../../types';

export type EditorProps = {
  dream: Dream.Dream;
};

export const Editor = ({ dream }: EditorProps) => {
  const echoSchema = Obj.getSchema(dream);
  const schema = useMemo(() => echoSchema && omitId(echoSchema), [echoSchema]);

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
    <Form.Root schema={schema} values={dream} autoSave onSave={handleSave}>
      <Form.Viewport>
        <Form.Content>
          <Form.FieldSet />
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};
