//
// Copyright 2024 DXOS.org
//

import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import React, { type PropsWithChildren, useCallback, useMemo } from 'react';

import { DXN, Obj, Ref, Tag, Type } from '@dxos/echo';
import { type JsonPath, splitJsonPath } from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';
import { Form, type FormFieldMap, omitId } from '@dxos/react-ui-form';
import { HuePicker } from '@dxos/react-ui-pickers';
import { composable, composableProps } from '@dxos/ui-theme';
import { isNonNullable } from '@dxos/util';

import { meta as pluginMeta } from '../../meta';

const createFieldMap: FormFieldMap = {
  hue: ({ type, label, layout, getValue, onValueChange }) => {
    const handleChange = useCallback((nextHue: string) => onValueChange(type, nextHue), [onValueChange, type]);
    const handleReset = useCallback(() => onValueChange(type, undefined), [onValueChange, type]);
    return (
      <>
        {layout !== 'inline' && <Form.Label label={label} />}
        <HuePicker value={getValue()} onChange={handleChange} onReset={handleReset} />
      </>
    );
  },
};

// TODO(wittjosiah): Would be nice to control order when extending so this isn't always first/last.
const BaseSchema = Schema.Struct({
  tags: Schema.Array(Ref.Ref(Tag.Tag)).pipe(Schema.optional),
});

export type BaseObjectSettingsProps = PropsWithChildren<{
  object: Obj.Unknown;
}>;

// TODO(wittjosiah): Reconcile w/ ObjectForm.
export const BaseObjectSettings = composable<HTMLDivElement, BaseObjectSettingsProps>(
  ({ children, object, ...props }, forwardedRef) => {
    const db = Obj.getDatabase(object);

    const formSchema = useMemo(() => {
      return Function.pipe(
        Obj.getSchema(object),
        Option.fromNullable,
        Option.map((schema) => omitId(BaseSchema.pipe(Schema.extend(schema)))),
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

    const handleCreate = useCallback((schema: Type.AnyEntity, values: any) => {
      invariant(db);
      invariant(Type.isObjectSchema(schema));
      const newObject = db.add(Obj.make(schema, values));
      if (Obj.instanceOf(Tag.Tag, newObject)) {
        Obj.change(object, (obj) => {
          Obj.getMeta(obj).tags = [...(Obj.getMeta(obj).tags ?? []), Obj.getDXN(newObject).toString()];
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

        // Handle tags separately using Obj.change.
        const hasTagsChange = changedPaths.some((path) => splitJsonPath(path)[0] === 'tags');
        if (hasTagsChange) {
          Obj.change(object, (obj) => {
            Obj.getMeta(obj).tags = tags?.map((tag: Ref.Ref<Tag.Tag>) => tag.dxn.toString()) ?? [];
          });
        }

        // Handle other property changes.
        const nonTagPaths = changedPaths.filter((path) => splitJsonPath(path)[0] !== 'tags');
        if (nonTagPaths.length > 0) {
          Obj.change(object, () => {
            for (const path of nonTagPaths) {
              const parts = splitJsonPath(path);
              const value = Obj.getValue(values as any, parts);
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

    const { className } = composableProps(props);

    return (
      <Form.Root
        schema={formSchema}
        defaultValues={values as any}
        createTypename={Type.getTypename(Tag.Tag)}
        createOptionIcon='ph--plus--regular'
        createOptionLabel={['add tag label', { ns: pluginMeta.id }]}
        createInitialValuePath='label'
        createFieldMap={createFieldMap}
        db={db}
        onValuesChanged={handleChange}
        onCreate={handleCreate}
      >
        <Form.Viewport>
          <Form.Content classNames={className}>
            <Form.FieldSet />
            {children}
          </Form.Content>
        </Form.Viewport>
      </Form.Root>
    );
  },
);
