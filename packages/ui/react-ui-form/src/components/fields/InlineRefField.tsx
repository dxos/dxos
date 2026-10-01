//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { useCallback, useMemo } from 'react';

import { type Database, Obj, Ref, Type } from '@dxos/echo';
import { useType as defaultUseType } from '@dxos/echo-react';
import { ReferenceAnnotationId, type ReferenceAnnotationValue } from '@dxos/echo/Annotation';
import { type AnyProperties } from '@dxos/echo/internal';
import { SchemaEx } from '@dxos/effect';
import { DXN, type URI } from '@dxos/keys';
import { Next, useTranslation } from '@dxos/react-ui';

import { translationKey } from '#translations';
import { type FormFieldRendererProps, type RefFieldDataProps } from '#types';

import { omitId } from '../../util/index.ts';
import { FormFields } from '../FormFieldDispatch.tsx';
import { FormFieldSet } from '../FormFieldSet.tsx';
import { FormRoot } from '../FormRoot.tsx';

type UseType = (db?: Database.Database, typeUri?: URI.URI) => Type.AnyEntity | undefined;

export type InlineRefFieldProps = FormFieldRendererProps &
  Pick<RefFieldDataProps, 'onCreate'> & {
    useType?: UseType;
  };

/**
 * A referenced object's own fields inline (`FormInlineAnnotation`), as a nested group bound to the target: each
 * changed path is written back to it with `Obj.setValue` in one `Obj.update`. An empty ref offers to create the target.
 */
export const InlineRefField = ({
  type,
  readonly,
  label,
  db,
  getValue,
  onValueChange,
  onCreate,
  useType = defaultUseType,
}: InlineRefFieldProps) => {
  const { t } = useTranslation(translationKey);
  const reference = getValue();
  const typename = useMemo(
    () => SchemaEx.findAnnotation<ReferenceAnnotationValue>(type, ReferenceAnnotationId)?.typename,
    [type],
  );
  const createType = useType(db, typename ? DXN.make(typename) : undefined);
  const handleCreate = useCallback(async () => {
    if (!createType || !onCreate) {
      return;
    }
    const created = await onCreate(createType, {});
    if (created) {
      onValueChange(type, Ref.make(created));
    }
  }, [createType, onCreate, onValueChange, type]);

  if (readonly && !Ref.isRef(reference)) {
    return null;
  }

  return (
    <FormFieldSet label={label} collapsible nested>
      {Ref.isRef(reference) ? (
        <InlineForm reference={reference} db={db} readonly={readonly} useType={useType} />
      ) : (
        !readonly &&
        onCreate && (
          <Next.Group fill>
            <Next.Button
              icon='ph--plus--regular'
              label={label || t('ref-field.placeholder')}
              disabled={!createType}
              onClick={() => void handleCreate()}
            />
          </Next.Group>
        )
      )}
    </FormFieldSet>
  );
};

type InlineFormProps = {
  reference: Ref.Ref<any>;
  db?: Database.Database;
  readonly?: boolean;
  useType?: UseType;
};

/** The target's form: its fields render straight into the enclosing group, sharing its tracks. */
const InlineForm = ({ reference, db, readonly, useType = defaultUseType }: InlineFormProps) => {
  const target = useAtomValue(useMemo(() => reference.atom, [reference]));
  const typeFromRegistry = useType(db, target ? Obj.getTypeURI(target) : undefined);
  const targetType = (target && Obj.getType(target)) || typeFromRegistry;
  const schema = useMemo(() => (targetType ? omitId(Type.getSchema(targetType)) : undefined), [targetType]);
  const defaultValues = useMemo(() => (target ? { ...target } : {}), [target]);
  const handleChange = useCallback(
    (
      values: AnyProperties,
      { isValid, changed }: { isValid: boolean; changed: Record<SchemaEx.JsonPath, boolean> },
    ) => {
      if (!isValid || !target) {
        return;
      }
      const paths = (Object.keys(changed) as SchemaEx.JsonPath[]).filter((path) => changed[path]);
      if (paths.length > 0) {
        Obj.update(target, (target) => {
          for (const path of paths) {
            const parts = SchemaEx.splitJsonPath(path);
            Obj.setValue(target, parts, SchemaEx.getValue(values, path));
          }
        });
      }
    },
    [target],
  );

  if (!target || !schema) {
    return null;
  }

  return (
    <FormRoot db={db} schema={schema} defaultValues={defaultValues} onValuesChanged={handleChange}>
      <FormFields readonly={readonly} />
    </FormRoot>
  );
};
