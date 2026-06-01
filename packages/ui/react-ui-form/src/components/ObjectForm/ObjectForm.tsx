//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Obj, Ref, Tag, Type } from '@dxos/echo';
import { type JsonPath, splitJsonPath } from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';
import { URI } from '@dxos/keys';
import { HuePicker } from '@dxos/react-ui-pickers';
import { isNonNullable } from '@dxos/util';

import { translationKey } from '#translations';

import { Form, type FormFieldMap, META_TAGS_KEY, withMetaTags } from '../Form';

export type ObjectFormProps = {
  type: Type.AnyEntity;
  object: Obj.Unknown;
};

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

export const ObjectForm = ({ object, type }: ObjectFormProps) => {
  const db = Obj.getDatabase(object);
  const meta = Obj.getMeta(object);
  const tags = (meta.tags ?? []).map((tag) => db?.makeRef(URI.make(tag))).filter(isNonNullable);
  const values = useMemo(() => ({ [META_TAGS_KEY]: tags, ...object }), [object, tags]);
  const formSchema = useMemo(() => withMetaTags(Type.getSchema(type)), [type]);

  const handleCreate = useCallback((type: Type.AnyEntity, values: any) => {
    invariant(db);
    invariant(Type.isObject(type));
    const newObject = db.add(Obj.make(type, values));
    if (Obj.instanceOf(Tag.Tag, newObject)) {
      Obj.update(object, (object) => {
        Obj.getMeta(object).tags = [...(Obj.getMeta(object).tags ?? []), Obj.getURI(newObject)];
      });
    }
  }, []);

  // TODO(wittjosiah): Use FormRootProps type.
  const handleChange = useCallback(
    (
      { [META_TAGS_KEY]: metaTags, ...values }: any,
      { isValid, changed }: { isValid: boolean; changed: Record<JsonPath, boolean> },
    ) => {
      if (!isValid) {
        return;
      }

      const changedPaths = Object.keys(changed).filter((path) => changed[path as JsonPath]) as JsonPath[];

      // Handle meta-tags separately using Obj.update.
      const hasTagsChange = changedPaths.some((path) => splitJsonPath(path)[0] === META_TAGS_KEY);
      if (hasTagsChange) {
        Obj.update(object, (object) => {
          Obj.getMeta(object).tags = metaTags?.map((tag: Ref.Ref<Tag.Tag>) => tag.uri) ?? [];
        });
      }

      // Handle other property changes.
      const nonTagPaths = changedPaths.filter((path) => splitJsonPath(path)[0] !== META_TAGS_KEY);
      if (nonTagPaths.length > 0) {
        Obj.update(object, () => {
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
