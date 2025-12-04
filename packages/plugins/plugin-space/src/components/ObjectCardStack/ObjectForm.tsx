//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useMemo } from 'react';

import { DXN, Obj, type Ref, Tag, Type } from '@dxos/echo';
import { type JsonPath, splitJsonPath } from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';
import { getSpace } from '@dxos/react-client/echo';
import { Form, omitId, useRefQueryOptions } from '@dxos/react-ui-form';
import { isNonNullable } from '@dxos/util';

import { meta as pluginMeta } from '../../meta';

const TagSchema = Tag.Tag.pipe(Schema.omit('id'));

export type ObjectFormProps = {
  schema: Schema.Schema.AnyNoContext;
  object: Obj.Any;
};

export const ObjectForm = ({ object, schema }: ObjectFormProps) => {
  const space = getSpace(object);

  const formSchema = useMemo(
    () =>
      Schema.Struct({
        tags: Schema.Array(Type.Ref(Tag.Tag)).pipe(Schema.optional),
      }).pipe(Schema.extend(omitId(schema))),
    [schema],
  );

  const meta = Obj.getMeta(object);
  const tags = (meta.tags ?? []).map((tag) => space?.db.makeRef(DXN.parse(tag))).filter(isNonNullable);
  const values = useMemo(() => ({ tags, ...object }), [object, tags]);

  const handleRefQueryLookup = useRefQueryOptions({ space });

  const handleCreateTag = useCallback((values: Schema.Schema.Type<typeof TagSchema>) => {
    invariant(space);
    const tag = space.db.add(Tag.make(values));
    const meta = Obj.getMeta(object);
    meta.tags = [...(meta.tags ?? []), Obj.getDXN(tag).toString()];
  }, []);

  // TODO(wittjosiah): Use FormRootProps type.
  const handleChange = useCallback(
    ({ tags, ...values }: any, { isValid, changed }: { isValid: boolean; changed: Record<JsonPath, boolean> }) => {
      if (!isValid) {
        return;
      }

      const changedPaths = Object.keys(changed).filter((path) => changed[path as JsonPath]) as JsonPath[];
      for (const path of changedPaths) {
        const parts = splitJsonPath(path);
        // TODO(wittjosiah): This doesn't handle array paths well.
        if (parts[0] === 'tags') {
          const meta = Obj.getMeta(object);
          meta.tags = tags?.map((tag: Ref.Ref<Tag.Tag>) => tag.dxn.toString()) ?? [];
          continue;
        }

        const value = Obj.getValue(values, parts);
        console.log('set value', isValid, parts, value);
        Obj.setValue(object, parts, value);
      }
    },
    [object],
  );

  return (
    <Form.Root
      schema={omitId(formSchema)}
      values={values}
      createSchema={TagSchema}
      createOptionIcon='ph--plus--regular'
      createOptionLabel={['add tag label', { ns: pluginMeta.id }]}
      createInitialValuePath='label'
      onValuesChanged={handleChange}
      onCreate={handleCreateTag}
      onQueryRefOptions={handleRefQueryLookup}
    >
      <Form.Viewport>
        <Form.Content>
          <Form.FieldSet />
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};
