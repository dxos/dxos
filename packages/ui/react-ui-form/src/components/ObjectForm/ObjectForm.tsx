//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Obj, Ref, Tag, Type } from '@dxos/echo';
import { SchemaEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { HuePicker } from '@dxos/react-ui-pickers';

import { translationKey } from '#translations';
import { type FormFieldMap } from '#types';

import { META_TAGS_KEY, Form, withMetaTags } from '../Form';

export type ObjectFormProps = {
  type: Type.AnyEntity;
  object: Obj.Unknown;
};

export const ObjectForm = ({ object, type }: ObjectFormProps) => {
  const db = Obj.getDatabase(object);
  const meta = Obj.getMeta(object);
  // `meta.tags` already holds `Ref<Tag>`s (materialized by the database handler).
  const tags = [...meta.tags];
  const values = useMemo(() => ({ [META_TAGS_KEY]: tags, ...object }), [object, tags]);
  const formSchema = useMemo(() => withMetaTags(Type.getSchema(type)), [type]);

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
      defaultValues={values}
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
