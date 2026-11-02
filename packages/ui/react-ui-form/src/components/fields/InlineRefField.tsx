//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { useCallback, useMemo } from 'react';

import { type Database, Obj, Ref, Type } from '@dxos/echo';
import { useType as defaultUseType, useLabel } from '@dxos/echo-react';
import * as Annotation from '@dxos/echo/Annotation';
import { type AnyProperties } from '@dxos/echo/internal';
import * as SchemaEx from '@dxos/effect/SchemaEx';
import { DXN, type URI } from '@dxos/keys';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';

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
    /** Whether the group starts open. */
    defaultOpen?: boolean;
  };

/**
 * A referenced object's own fields inline (`FormInlineAnnotation`), as a nested group bound to the target: each
 * changed path is written back to it with `Obj.setValue` in one `Obj.update`. The group is named by the field's label,
 * or by the target's own when it has none (an owned array's row). An empty ref offers to create the target.
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
  defaultOpen,
}: InlineRefFieldProps) => {
  const { t } = Hooks.useTranslation(translationKey);
  const reference = getValue();
  const typename = useMemo(
    () =>
      SchemaEx.findAnnotation<Annotation.ReferenceAnnotationValue>(type, Annotation.ReferenceAnnotationId)?.typename,
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

  if (Ref.isRef(reference)) {
    return (
      <InlineTarget
        reference={reference}
        label={label}
        defaultOpen={defaultOpen}
        db={db}
        readonly={readonly}
        useType={useType}
      />
    );
  }

  return (
    <FormFieldSet label={label} collapsible nested defaultOpen={defaultOpen}>
      {!readonly && onCreate && (
        <Button.Group fill>
          <Button.Root
            icon='ph--plus--regular'
            label={label || t('ref-field.placeholder')}
            disabled={!createType}
            onClick={() => void handleCreate()}
          />
        </Button.Group>
      )}
    </FormFieldSet>
  );
};

type InlineTargetProps = {
  reference: Ref.Ref<any>;
  label: string;
  defaultOpen?: boolean;
  db?: Database.Database;
  readonly?: boolean;
  useType?: UseType;
};

/** The target's group: its fields render straight into it, sharing its tracks. */
const InlineTarget = ({ reference, label, defaultOpen, db, readonly, useType = defaultUseType }: InlineTargetProps) => {
  const { t } = Hooks.useTranslation(translationKey);
  const target = useAtomValue(useMemo(() => reference.atom, [reference]));
  // Never empty: a legend that appears with the first letter typed would remount the field being typed in.
  const legend = useLabel(target) || t('untitled.label');
  return (
    <FormFieldSet label={label || legend} collapsible nested defaultOpen={defaultOpen}>
      <InlineForm target={target} db={db} readonly={readonly} useType={useType} />
    </FormFieldSet>
  );
};

type InlineFormProps = {
  target?: Obj.Unknown;
  db?: Database.Database;
  readonly?: boolean;
  useType?: UseType;
};

/** The target's form, writing each changed path back to it. */
const InlineForm = ({ target, db, readonly, useType = defaultUseType }: InlineFormProps) => {
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
