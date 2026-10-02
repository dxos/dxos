//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import type * as Schema from 'effect/Schema';
import React, { type PropsWithChildren, useCallback, useMemo } from 'react';

import { type Database, Filter, Obj, Ref, Tag, Type } from '@dxos/echo';
import { useObject, useQuery, useType } from '@dxos/echo-react';
import { SchemaEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { composable } from '@dxos/react-ui';
import { FactoryAnnotation } from '@dxos/schema';

import { translationKey } from '#translations';
import { type CreateOptions, type FormFieldMap, type RefFieldDataProps } from '#types';

import { omitId } from '../util/index.ts';
import { HueField } from './fields/index.ts';
import { Form } from './Form.tsx';
import { FormField } from './FormField.tsx';
import { META_TAGS_KEY, partitionMetaTags, withMetaTags } from './meta-tags.ts';

/** The tags row's create option: `Add tag “{query}”`. */
const CREATE_TAG_LABEL: CreateOptions['createOptionLabel'] = ['add-tag-query.label', { ns: translationKey }];

/** The create form for a tag (the meta-tags row's create target): its `hue` as a hue Select. */
const createFieldMap: FormFieldMap = {
  hue: (props) => (
    <FormField path={props.jsonPath} label={props.label} presentation={props.presentation}>
      <HueField {...props} />
    </FormField>
  ),
};

/** The form's values: the object's properties, and its editable meta tags (an array of Tag refs, per `withMetaTags`). */
type ObjectFormValues = { [META_TAGS_KEY]?: readonly Ref.Ref<Tag.Tag>[] } & Record<string, unknown>;

type ObjectFormModelOptions = {
  object: Obj.Unknown;
  /** The object's snapshot; a fresh value whenever the object changes. */
  snapshot: object;
  db: Database.Database | undefined;
};

/**
 * The form model shared by `ObjectForm` and `ObjectProperties`: the object's values with its editable meta tags under
 * {@link META_TAGS_KEY}, a change handler writing changed paths (and tags) back through `Obj.update`, and a create
 * handler that adds a ref field's new target to the object's database.
 */
const useObjectFormModel = ({ object, snapshot, db }: ObjectFormModelOptions) => {
  const meta = Obj.getMeta(object);
  // Provider-owned tags are held out of the form and written back untouched (see `partitionMetaTags`).
  const spaceTags = useQuery(db, Filter.type(Tag.Tag));
  const { editable: tags, preserved: preservedTags } = useMemo(
    () => partitionMetaTags([...meta.tags], spaceTags),
    [meta.tags, spaceTags],
  );
  const values = useMemo(() => ({ [META_TAGS_KEY]: tags, ...snapshot }), [snapshot, tags]);

  // A type whose structure `Obj.make` alone cannot produce (a required backing ref) declares a `FactoryAnnotation`.
  const handleCreate = useCallback(
    (type: Type.AnyEntity, values: any): Obj.Unknown => {
      invariant(db);
      invariant(Type.isObject(type));
      const factory = Option.getOrUndefined(FactoryAnnotation.get(Type.getSchema(type)));
      const made = factory ? factory(values) : Obj.make(type, values);
      invariant(Obj.isObject(made));
      const added = db.add(made);
      invariant(Obj.isObject(added));
      return added;
    },
    [db],
  );

  const handleChange = useCallback(
    (
      { [META_TAGS_KEY]: metaTags, ...values }: ObjectFormValues,
      { isValid, changed }: { isValid: boolean; changed: Record<SchemaEx.JsonPath, boolean> },
    ) => {
      if (!isValid) {
        return;
      }

      const changedPaths = Object.keys(changed)
        .filter(SchemaEx.isJsonPath)
        .filter((path) => changed[path]);
      const isTagPath = (path: SchemaEx.JsonPath) => SchemaEx.splitJsonPath(path)[0] === META_TAGS_KEY;
      if (changedPaths.some(isTagPath)) {
        Obj.update(object, (object) => {
          // A copy, so later in-place form edits stay outside `Obj.update`; this replaces `tags`, so restore the rest.
          Obj.getMeta(object).tags = [...preservedTags, ...(metaTags ?? [])];
        });
      }

      const propertyPaths = changedPaths.filter((path) => !isTagPath(path));
      if (propertyPaths.length > 0) {
        Obj.update(object, (object) => {
          for (const path of propertyPaths) {
            Obj.setValue(object, SchemaEx.splitJsonPath(path), SchemaEx.getValue(values, path));
          }
        });
      }
    },
    [object, preservedTags],
  );

  return { values, handleCreate, handleChange };
};

export type ObjectFormProps = {
  type: Type.AnyEntity;
  object: Obj.Unknown;
  /**
   * Overrides the rendered fields, e.g. a projection of `type`'s schema; values are still read from and written to
   * `object` by path. Defaults to `type`'s schema.
   */
  schema?: Schema.Codec<any, any>;
  /** Render the meta-tags field. Defaults to `true`. */
  showTags?: boolean;
};

/** An object's properties (and meta tags) as a next Form in its host's grid, writing each change back. */
export const ObjectForm = ({ object, type, schema, showTags = true }: ObjectFormProps) => {
  const db = Obj.getDatabase(object);
  // ECHO reactivity is atom-based: reading the raw object in render does not subscribe, so subscribe explicitly.
  const [snapshot] = useObject(object);
  const { values, handleCreate, handleChange } = useObjectFormModel({ object, snapshot, db });
  const formSchema = useMemo(() => {
    const base = schema ?? Type.getSchema(type);
    return showTags ? withMetaTags(base) : omitId(base);
  }, [schema, type, showTags]);

  return (
    <Form.Root
      schema={formSchema}
      values={values}
      db={db}
      createTypename={Type.getTypename(Tag.Tag)}
      createOptionLabel={CREATE_TAG_LABEL}
      createOptionIcon='ph--tag--regular'
      createInitialValuePath='label'
      createFieldMap={createFieldMap}
      onValuesChanged={handleChange}
      onCreate={handleCreate}
    >
      <Form.Content>
        <Form.Fields />
      </Form.Content>
    </Form.Root>
  );
};

export type ObjectPropertiesProps = PropsWithChildren<
  { object: Obj.Unknown } & Pick<RefFieldDataProps, 'getCreateDefaults' | 'resolveCreateEntry'>
>;

/**
 * An object's properties pane: its type's fields and meta tags in a scrolling form, then `children` (e.g. a plugin's
 * extra rows) in a set of their own. Composable, so a host's `Panel.Body asChild` merges its slot props and ref onto
 * the form's viewport.
 */
export const ObjectProperties = composable<HTMLDivElement, ObjectPropertiesProps>(
  ({ children, object, getCreateDefaults, resolveCreateEntry, ...props }, forwardedRef) => {
    const db = Obj.getDatabase(object);
    const [snapshot] = useObject(object);
    const { values, handleCreate, handleChange } = useObjectFormModel({ object, snapshot, db });
    // `Obj.getType` misses database-registered (dynamic) schemas, which `useType` resolves by the stored type URI.
    const registered = useType(db, Obj.getTypeURI(object));
    const type = Obj.getType(object) ?? registered;
    const formSchema = useMemo(() => (type ? withMetaTags(Type.getSchema(type)) : undefined), [type]);
    if (!formSchema) {
      return null;
    }

    return (
      <Form.Root
        schema={formSchema}
        values={values}
        db={db}
        createTypename={Type.getTypename(Tag.Tag)}
        createOptionLabel={CREATE_TAG_LABEL}
        createOptionIcon='ph--tag--regular'
        createInitialValuePath='label'
        createFieldMap={createFieldMap}
        onValuesChanged={handleChange}
        onCreate={handleCreate}
        getCreateDefaults={getCreateDefaults}
        resolveCreateEntry={resolveCreateEntry}
      >
        <Form.Viewport {...props} scroll ref={forwardedRef}>
          <Form.Content>
            <Form.Fields />
            {children && <Form.FieldSet>{children}</Form.FieldSet>}
          </Form.Content>
        </Form.Viewport>
      </Form.Root>
    );
  },
);
