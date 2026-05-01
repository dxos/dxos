//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useMemo } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { type JsonPath, splitJsonPath } from '@dxos/effect';
import { Card } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

const schemaForValue = (value: unknown): Schema.Schema.AnyNoContext | undefined => {
  switch (typeof value) {
    case 'string':
      return Schema.String;
    case 'number':
      return Schema.Number;
    case 'boolean':
      return Schema.Boolean;
    default:
      return undefined;
  }
};

/**
 * Reserved keys: `id`, plus any `~`-prefixed key (ECHO uses `~`-prefixed
 * string keys to brand entity instances and schemas — KindId,
 * SchemaKindId, SnapshotKindId, etc. — and the `~` namespace is reserved
 * for that purpose). They show up in `Object.keys` but aren't user data.
 */
const isInternalKey = (key: string) => key === 'id' || key.startsWith('~');

export const ExpandoCard = ({ subject, ignorePaths }: AppSurface.ObjectCardProps) => {
  const schema = useMemo(() => {
    const ignored = new Set(ignorePaths ?? []);
    const fields: Record<string, Schema.Schema.AnyNoContext> = {};
    for (const key of Object.keys(subject)) {
      if (isInternalKey(key) || ignored.has(key)) {
        continue;
      }
      const fieldSchema = schemaForValue((subject as any)[key]);
      if (fieldSchema) {
        fields[key] = fieldSchema;
      }
    }
    return Schema.Struct(fields);
  }, [subject, ignorePaths]);

  const handleSave = useCallback(
    (values: any, { changed }: { changed: Record<string, boolean> }) => {
      const paths = Object.keys(changed).filter((path) => changed[path]);
      Obj.change(subject, () => {
        for (const path of paths) {
          const value = values[path];
          const parts = splitJsonPath(path as JsonPath);
          Obj.setValue(subject, parts, value);
        }
      });
    },
    [subject],
  );

  return (
    <Card.Content>
      <Form.Root schema={schema} values={subject} autoSave onSave={handleSave}>
        <Form.Viewport>
          <Form.Content>
            <Form.FieldSet />
          </Form.Content>
        </Form.Viewport>
      </Form.Root>
    </Card.Content>
  );
};
