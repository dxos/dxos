//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useMemo } from 'react';

import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import * as SchemaEx from '@dxos/effect/SchemaEx';
import { Form } from '@dxos/react-ui-form';
import * as Card from '@dxos/react-ui/Card';

const schemaForValue = (value: unknown): Schema.Codec<any, any> | undefined => {
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
  const [snapshot] = useObject(subject);
  // Built once per object from its fields at open, so an autosave does not rebuild the form and a value later
  // cleared to null keeps its field.
  const schema = useMemo(() => {
    const ignored = new Set(ignorePaths ?? []);
    const fields: Record<string, Schema.Codec<any, any>> = {};
    for (const [key, value] of Object.entries(subject)) {
      if (isInternalKey(key) || ignored.has(key)) {
        continue;
      }
      const fieldSchema = schemaForValue(value);
      if (fieldSchema) {
        fields[key] = fieldSchema;
      }
    }
    return Schema.Struct(fields);
  }, [subject, ignorePaths]);

  const handleSave = useCallback(
    (values: any, { changed }: { changed: Record<string, boolean> }) => {
      const paths = Object.keys(changed).filter((path) => changed[path]);
      Obj.update(subject, (subject) => {
        for (const path of paths) {
          const value = values[path];
          const parts = SchemaEx.splitJsonPath(path as SchemaEx.JsonPath);
          Obj.setValue(subject, parts, value);
        }
      });
    },
    [subject],
  );

  return (
    <Card.Body>
      <Form.Root schema={schema} values={snapshot} autoSave onSave={handleSave}>
        <Form.Viewport>
          <Form.Content>
            <Form.Fields />
          </Form.Content>
        </Form.Viewport>
      </Form.Root>
    </Card.Body>
  );
};
