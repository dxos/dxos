//
// Copyright 2024 DXOS.org
//

import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import React, { type PropsWithChildren, useCallback, useMemo } from 'react';

import { DXN, Obj, type Ref, Tag, Type } from '@dxos/echo';
import { type JsonPath, splitJsonPath } from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';
import { type ThemedClassName } from '@dxos/react-ui';
import { Form, omitId } from '@dxos/react-ui-form';
import { isNonNullable } from '@dxos/util';

import { meta as pluginMeta } from '../../meta';

// TODO(wittjosiah): Would be nice to control order when extending so this isn't always first/last.
const BaseSchema = Schema.Struct({
  tags: Schema.Array(Type.Ref(Tag.Tag)).pipe(Schema.optional),
});

export type BaseObjectSettingsProps = ThemedClassName<
  PropsWithChildren<{
    object: Obj.Unknown;
  }>
>;

// TODO(wittjosiah): Reconcile w/ ObjectDetailsPanel.
export const BaseObjectSettings = ({ classNames, children, object }: BaseObjectSettingsProps) => {
  const db = Obj.getDatabase(object);

  const formSchema = useMemo(() => {
    return Function.pipe(
      Obj.getSchema(object),
      Option.fromNullable,
      Option.map((schema) => BaseSchema.pipe(Schema.extend(schema))),
      Option.getOrUndefined,
    );
  }, [object]);

  const meta = Obj.getMeta(object);
  const tags = (meta.tags ?? []).map((tag) => db?.makeRef(DXN.parse(tag))).filter(isNonNullable);
  const values = useMemo(
    () => ({
      tags,
      ...object,
    }),
    [object, tags],
  );

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
    (
      { tags, ...values }: Schema.Schema.Type<typeof formSchema>,
      { isValid, changed }: { isValid: boolean; changed: Record<JsonPath, boolean> },
    ) => {
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

  if (!formSchema) {
    return null;
  }

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
        <Form.Content classNames={classNames}>
          <Form.FieldSet />
          {children}
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};
