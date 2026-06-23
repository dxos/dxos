//
// Copyright 2024 DXOS.org
//

import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import React, { type PropsWithChildren, useCallback, useMemo } from 'react';

import { Obj, Ref, Tag, Type } from '@dxos/echo';
import { useType } from '@dxos/echo-react';
import { SchemaEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { composable, composableProps } from '@dxos/react-ui';
import { HuePicker } from '@dxos/react-ui-pickers';
import { FactoryAnnotation } from '@dxos/schema';

import { translationKey } from '#translations';
import { type FormFieldMap, type RefFieldDataProps } from '#types';

import { Form, META_TAGS_KEY, withMetaTags } from '../Form';

export type ObjectPropertiesProps = PropsWithChildren<
  { object: Obj.Unknown } & Pick<RefFieldDataProps, 'getCreateDefaults'>
>;

// TODO(wittjosiah): Reconcile w/ ObjectForm.
export const ObjectProperties = composable<HTMLDivElement, ObjectPropertiesProps>(
  ({ children, object, getCreateDefaults, ...props }, forwardedRef) => {
    const db = Obj.getDatabase(object);
    const meta = Obj.getMeta(object);
    // `meta.tags` already holds `Ref<Tag>`s (materialized by the database handler).
    const tags = [...meta.tags];
    const values = useMemo(() => ({ [META_TAGS_KEY]: tags, ...object }), [object, tags]);

    // Obj.getType fails for database-registered (dynamic) schemas due to DXN mismatch;
    // useType queries by the object's stored type URI, resolving both static and dynamic schemas.
    const typeUri = Obj.getTypeURI(object);
    const typeFromRegistry = useType(db, typeUri);
    const type = Obj.getType(object) ?? typeFromRegistry;

    const formSchema = useMemo(() => {
      return Function.pipe(
        type,
        Option.fromNullable,
        Option.map((type) => Type.getSchema(type)),
        Option.map((schema) => withMetaTags(schema)),
        Option.getOrUndefined,
      );
    }, [type]);

    // Persist a newly-created object referenced by one of the form's ref
    // fields and return it. The calling RefField wires the new Ref into its
    // own slot's form value; for the synthetic `_tags` array, the resulting
    // form change is then synced back to `Obj.getMeta(object).tags` by
    // `handleChange` below — so Tag.Tag follows the same generic path as any
    // other ref-array field, no type-specific branching required here.
    //
    // Schemas whose required structure can't be produced by `Obj.make(schema,
    // values)` alone (e.g. types with a required ref to a backing object) can
    // declare a `FactoryAnnotation` to take over construction.
    const handleCreate = useCallback(
      (type: Type.AnyEntity, values: any): Obj.Unknown => {
        invariant(db);
        invariant(Type.isObject(type));
        const factory = Option.getOrUndefined(FactoryAnnotation.get(Type.getSchema(type)));
        const newObject = factory ? (factory(values) as Obj.Unknown) : Obj.make(type, values);
        return db.add(newObject) as Obj.Unknown;
      },
      [db],
    );

    // TODO(wittjosiah): Use FormRootProps type.
    const handleChange = useCallback(
      (
        { [META_TAGS_KEY]: metaTags, ...values }: any,
        { isValid, changed }: { isValid: boolean; changed: Record<SchemaEx.JsonPath, boolean> },
      ) => {
        if (!isValid) {
          return;
        }

        const changedPaths = Object.keys(changed).filter(
          (path) => changed[path as SchemaEx.JsonPath],
        ) as SchemaEx.JsonPath[];

        // Handle meta-tags separately using Obj.update.
        const hasTagsChange = changedPaths.some((path) => SchemaEx.splitJsonPath(path)[0] === META_TAGS_KEY);
        if (hasTagsChange) {
          Obj.update(object, (object) => {
            // Copy so later in-place form mutations don't bypass the `Obj.update` boundary.
            Obj.getMeta(object).tags = Array.isArray(metaTags) ? [...(metaTags as Ref.Ref<Tag.Tag>[])] : [];
          });
        }

        // Handle other property changes.
        const nonTagPaths = changedPaths.filter((path) => SchemaEx.splitJsonPath(path)[0] !== META_TAGS_KEY);
        if (nonTagPaths.length > 0) {
          Obj.update(object, () => {
            for (const path of nonTagPaths) {
              const parts = SchemaEx.splitJsonPath(path);
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
        db={db}
        schema={formSchema}
        defaultValues={values as any}
        createTypename={Type.getTypename(Tag.Tag)}
        createOptionIcon='ph--plus--regular'
        createOptionLabel={['add-tag.label', { ns: translationKey }]}
        createInitialValuePath='label'
        createFieldMap={createFieldMap}
        onValuesChanged={handleChange}
        onCreate={handleCreate}
        getCreateDefaults={getCreateDefaults}
      >
        <Form.Viewport {...composableProps(props)} scroll ref={forwardedRef}>
          <Form.Content>
            <Form.FieldSet />
            <Form.Section>{children}</Form.Section>
          </Form.Content>
        </Form.Viewport>
      </Form.Root>
    );
  },
);

const createFieldMap: FormFieldMap = {
  hue: ({ type, label, presentation, getValue, onValueChange }) => {
    const handleChange = useCallback((nextHue: string) => onValueChange(type, nextHue), [onValueChange, type]);
    const handleReset = useCallback(() => onValueChange(type, undefined), [onValueChange, type]);
    return (
      <>
        {presentation !== 'inline' && <Form.Label label={label} />}
        <HuePicker value={getValue()} onChange={handleChange} onReset={handleReset} />
      </>
    );
  },
};
