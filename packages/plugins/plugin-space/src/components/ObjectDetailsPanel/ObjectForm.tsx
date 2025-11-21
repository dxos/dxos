//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useMemo } from 'react';

import { DXN, Obj, type Ref, Tag, Type } from '@dxos/echo';
import { type JsonPath, setValue } from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';
import { getSpace } from '@dxos/react-client/echo';
import { Form, useRefQueryLookupHandler } from '@dxos/react-ui-form';
import { isNonNullable } from '@dxos/util';

import { meta as pluginMeta } from '../../meta';

const TagSchema = Tag.Tag.pipe(Schema.omit('id'));

type ObjectFormProps = { object: Obj.Any; schema: Schema.Schema.AnyNoContext };

export const ObjectForm = ({ object, schema }: ObjectFormProps) => {
  const space = getSpace(object);
  const handleRefQueryLookup = useRefQueryLookupHandler({ space });

  const formSchema = useMemo(
    () => Schema.Struct({ tags: Schema.Array(Type.Ref(Tag.Tag)).pipe(Schema.optional) }).pipe(Schema.extend(schema)),
    [schema],
  );

  const meta = Obj.getMeta(object);
  const tags = (meta.tags ?? []).map((tag) => space?.db.ref(DXN.parse(tag))).filter(isNonNullable);
  const values = useMemo(() => ({ tags, ...object }), [object, tags]);

  const handleCreateTag = useCallback((values: Schema.Schema.Type<typeof TagSchema>) => {
    invariant(space);
    const tag = space.db.add(Tag.make(values));
    const meta = Obj.getMeta(object);
    meta.tags = [...(meta.tags ?? []), Obj.getDXN(tag).toString()];
  }, []);

  const handleSave = useCallback(
    ({ tags, ...values }: any, { changed }: { changed: Record<JsonPath, boolean> }) => {
      const changedPaths = Object.keys(changed).filter((path) => changed[path as JsonPath]) as JsonPath[];
      for (const path of changedPaths) {
        if (path === 'tags') {
          const meta = Obj.getMeta(object);
          meta.tags = tags?.map((tag: Ref.Ref<Tag.Tag>) => tag.dxn.toString()) ?? [];
          continue;
        }

        const value = values[path];
        setValue(object, path, value);
      }
    },
    [object],
  );

  return (
    <Form
      autoSave
      schema={formSchema}
      values={values}
      createSchema={TagSchema}
      createOptionIcon='ph--plus--regular'
      createOptionLabel={['add tag label', { ns: pluginMeta.id }]}
      createInitialValuePath='label'
      onCreate={handleCreateTag}
      onSave={handleSave}
      onQueryRefOptions={handleRefQueryLookup}
    />
  );
};
