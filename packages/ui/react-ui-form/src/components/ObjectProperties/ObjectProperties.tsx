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
import { HuePicker } from '@dxos/react-ui-pickers';
import { FactoryAnnotation } from '@dxos/schema';
import { composable, composableProps } from '@dxos/ui-theme';
import { isNonNullable } from '@dxos/util';

import { translationKey } from '#translations';

import { Form, type FormFieldMap, omitId } from '../Form';

export type ObjectPropertiesProps = PropsWithChildren<{ object: Obj.Unknown }>;

// TODO(wittjosiah): Reconcile w/ ObjectForm.
export const ObjectProperties = composable<HTMLDivElement, ObjectPropertiesProps>(
  ({ children, object, ...props }, forwardedRef) => {
    const db = Obj.getDatabase(object);
    const meta = Obj.getMeta(object);
    const tags = (meta.tags ?? []).map((tag) => db?.makeRef(DXN.parse(tag))).filter(isNonNullable);
    const values = useMemo(() => ({ tags, ...object }), [object, tags]);

    const formSchema = useMemo(() => {
      return Function.pipe(
        Obj.getSchema(object),
        Option.fromNullable,
        Option.map((schema) => omitId(BaseSchema.pipe(Schema.extend(schema)))),
        Option.getOrUndefined,
      );
    }, [object]);

    // Persist a newly-created object referenced by one of the form's ref
    // fields and return it. The calling RefField wires the new Ref into its
    // own slot's form value; for the BaseSchema `tags` array, the resulting
    // form change is then synced back to `Obj.getMeta(object).tags` by
    // `handleChange` below — so Tag.Tag follows the same generic path as any
    // other ref-array field, no type-specific branching required here.
    //
    // Schemas whose required structure can't be produced by `Obj.make(schema,
    // values)` alone (e.g. types with a required ref to a backing object) can
    // declare a `FactoryAnnotation` to take over construction.
    const handleCreate = useCallback(
      (schema: Type.AnyEntity, values: any): Obj.Unknown => {
        invariant(db);
        invariant(Type.isObjectSchema(schema));
        const factory = Option.getOrUndefined(FactoryAnnotation.get(schema));
        const newObject = factory ? (factory(values) as Obj.Unknown) : Obj.make(schema, values);
        return db.add(newObject) as Obj.Unknown;
      },
      [db],
    );

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

        // Handle tags separately using Obj.update.
        const hasTagsChange = changedPaths.some((path) => splitJsonPath(path)[0] === 'tags');
        if (hasTagsChange) {
          Obj.update(object, (object) => {
            Obj.getMeta(object).tags = tags?.map((tag: Ref.Ref<Tag.Tag>) => tag.dxn.toString()) ?? [];
          });
        }

        // Handle other property changes.
        const nonTagPaths = changedPaths.filter((path) => splitJsonPath(path)[0] !== 'tags');
        if (nonTagPaths.length > 0) {
          Obj.update(object, () => {
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

    return (
      <Form.Root
        schema={formSchema}
        defaultValues={values as any}
        createTypename={Type.getTypename(Tag.Tag)}
        createOptionIcon='ph--plus--regular'
        createOptionLabel={['add-tag.label', { ns: translationKey }]}
        createInitialValuePath='label'
        createFieldMap={createFieldMap}
        db={db}
        onValuesChanged={handleChange}
        onCreate={handleCreate}
      >
        <Form.Viewport {...composableProps(props)} ref={forwardedRef}>
          <Form.Content>
            <Form.FieldSet />
            {children}
          </Form.Content>
        </Form.Viewport>
      </Form.Root>
    );
  },
);

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
