//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useMemo } from 'react';

import { Obj, Ref, Tag, Type } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { SchemaEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { HuePicker } from '@dxos/react-ui-pickers';

import { translationKey } from '#translations';
import { type FormFieldMap } from '#types';

import { omitId } from '../../util';
import { Form, META_TAGS_KEY, withMetaTags } from '../Form';

export type ObjectFormProps = {
  type: Type.AnyEntity;
  object: Obj.Unknown;
  /**
   * Optional schema override for the rendered fields, e.g. a projection of `type`'s schema
   * (`Type.getSchema(T).pipe(Schema.pick(...))`). Values are still read from and written back to
   * `object` by path, so the picked fields must be paths on `object`. Defaults to `type`'s schema.
   */
  schema?: Schema.Schema.AnyNoContext;
  /** Render the meta-tags field. Defaults to `true`. */
  showTags?: boolean;
};

export const ObjectForm = ({ object, type, schema, showTags = true }: ObjectFormProps) => {
  const db = Obj.getDatabase(object);
  // Subscribe to the object so external/remote mutations re-render the form: ECHO reactivity is atom-based, so
  // reading the raw object during render does not establish a subscription. `snapshot` is a fresh value on change.
  const [snapshot] = useObject(object);
  const meta = Obj.getMeta(object);
  // `meta.tags` already holds `Ref<Tag>`s (materialized by the database handler).
  const tags = [...meta.tags];
  const values = useMemo(() => ({ [META_TAGS_KEY]: tags, ...snapshot }), [snapshot, tags]);
  const formSchema = useMemo(() => {
    const base = schema ?? Type.getSchema(type);
    // `withMetaTags` also drops `id`; keep it dropped when tags are omitted.
    return showTags ? withMetaTags(base) : omitId(base);
  }, [schema, type, showTags]);

  const handleCreate = useCallback((type: Type.AnyEntity, values: any) => {
    invariant(db);
    invariant(Type.isObject(type));
    const newObject = db.add(Obj.make(type, values));
    if (Obj.instanceOf(Tag.Tag, newObject)) {
      Obj.update(object, (object) => {
        Obj.getMeta(object).tags = [...Obj.getMeta(object).tags, Ref.make(newObject)];
      });
    }
  }, []);

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
      schema={formSchema}
      values={values}
      createTypename={Type.getTypename(Tag.Tag)}
      createOptionIcon='ph--plus--regular'
      createOptionLabel={['add-tag.label', { ns: translationKey }]}
      createInitialValuePath='label'
      createFieldMap={createFieldMap}
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
