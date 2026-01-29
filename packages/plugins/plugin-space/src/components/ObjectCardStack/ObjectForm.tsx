//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useMemo } from 'react';

import { DXN, Obj, type Ref, Tag, Type } from '@dxos/echo';
import { type JsonPath, splitJsonPath } from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';
import { Form, omitId } from '@dxos/react-ui-form';
import { isNonNullable } from '@dxos/util';

import { meta as pluginMeta } from '../../meta';

export type ObjectFormProps = {
  schema: Schema.Schema.AnyNoContext;
  object: Obj.Unknown;
};

export const ObjectForm = ({ object, schema }: ObjectFormProps) => {
  const db = Obj.getDatabase(object);

  const formSchema = useMemo(
    () =>
      Schema.Struct({
        tags: Schema.Array(Type.Ref(Tag.Tag)).pipe(Schema.optional),
      }).pipe(Schema.extend(omitId(schema))),
    [schema],
  );

  const meta = Obj.getMeta(object);
  const tags = (meta.tags ?? []).map((tag) => db?.makeRef(DXN.parse(tag))).filter(isNonNullable);
  const values = useMemo(() => ({ tags, ...object }), [object, tags]);

  const handleCreate = useCallback((schema: Type.Entity.Any, values: any) => {
    invariant(db);
    invariant(Type.Entity.isObject(schema));
    const newObject = db.add(Obj.make(schema, values));
    if (Obj.instanceOf(Tag.Tag, newObject)) {
      Obj.changeMeta(object, (meta) => {
        meta.tags = [...(meta.tags ?? []), Obj.getDXN(newObject).toString()];
      });
    }
  }, []);

  // TODO(wittjosiah): Use FormRootProps type.
  const handleChange = useCallback(
    ({ tags, ...values }: any, { isValid, changed }: { isValid: boolean; changed: Record<JsonPath, boolean> }) => {
      if (!isValid) {
        return;
      }

      const changedPaths = Object.keys(changed).filter((path) => changed[path as JsonPath]) as JsonPath[];

      // Handle tags separately using changeMeta.
      const hasTagsChange = changedPaths.some((path) => splitJsonPath(path)[0] === 'tags');
      if (hasTagsChange) {
        Obj.changeMeta(object, (meta) => {
          meta.tags = tags?.map((tag: Ref.Ref<Tag.Tag>) => tag.dxn.toString()) ?? [];
        });
      }

      // Handle other property changes.
      const nonTagPaths = changedPaths.filter((path) => splitJsonPath(path)[0] !== 'tags');
      if (nonTagPaths.length > 0) {
        Obj.change(object, () => {
          for (const path of nonTagPaths) {
            const parts = splitJsonPath(path);
            const value = Obj.getValue(values, parts);
            Obj.setValue(object, parts, value);
          }
        });
      }
    },
    [object],
  );

  return (
    <Form.Root
      schema={omitId(formSchema)}
      values={values}
      createOptionIcon='ph--plus--regular'
      createOptionLabel={['add tag label', { ns: pluginMeta.id }]}
      createInitialValuePath='label'
      db={db}
      onValuesChanged={handleChange}
      onCreate={handleCreate}
    >
      <Form.Viewport>
        <Form.Content>
          <Form.FieldSet />
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};
