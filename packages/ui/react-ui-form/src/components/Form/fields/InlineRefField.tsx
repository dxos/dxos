//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import React, { useCallback, useMemo } from 'react';

import { type Database, Obj, Ref, Type } from '@dxos/echo';
import { useType as defaultUseType } from '@dxos/echo-react';
import { ReferenceAnnotationId, type ReferenceAnnotationValue } from '@dxos/echo/internal';
import { SchemaEx } from '@dxos/effect';
import { Button, Icon, Input, useTranslation } from '@dxos/react-ui';

import { translationKey } from '#translations';

import { Form, omitId } from '../Form';
import { FormFieldLabel } from '../FormFieldComponent';
import { type RefFieldProps } from './RefField';

/**
 * Renders a referenced object's own fields inline (a nested form bound to the
 * target) rather than the {@link RefField} picker. Activated by
 * `FormInlineAnnotation.set(true)` on the `Ref` property.
 *
 * The nested form edits the target object directly: each changed path is
 * written back via `Obj.setValue` within an `Obj.update`, mirroring
 * `ObjectProperties` (without the synthetic meta-tags row).
 */
export const InlineRefField = (props: RefFieldProps) => {
  const {
    type,
    readonly,
    label,
    jsonPath,
    layout,
    db,
    getValue,
    onValueChange,
    onCreate,
    useType = defaultUseType,
  } = props;
  const { t } = useTranslation(translationKey);

  const reference = getValue() as Ref.Ref<any> | undefined;
  const typename = useMemo(
    () => (type ? SchemaEx.findAnnotation<ReferenceAnnotationValue>(type, ReferenceAnnotationId)?.typename : undefined),
    [type],
  );

  // Empty ref: offer to create the referenced object so the inline form has a target.
  const createType = useType(db, typename);
  const handleCreate = useCallback(async () => {
    if (!createType || !onCreate) {
      return;
    }
    const newObject = await onCreate(createType, {});
    if (newObject) {
      onValueChange(type, Ref.make(newObject));
    }
  }, [createType, onCreate, type, onValueChange]);

  if (readonly && !reference) {
    return null;
  }

  return (
    <Input.Root>
      {layout !== 'inline' && <FormFieldLabel readonly={readonly} label={label} path={jsonPath} />}
      {reference ? (
        <InlineForm reference={reference} db={db} readonly={readonly} useType={useType} />
      ) : (
        !readonly &&
        onCreate && (
          <Button classNames='w-full gap-form-gap' disabled={!createType || !db} onClick={() => void handleCreate()}>
            <Icon icon='ph--plus--regular' size={4} />
            <span>{label || t('ref-field.placeholder')}</span>
          </Button>
        )
      )}
    </Input.Root>
  );
};

type InlineFormProps = {
  reference: Ref.Ref<any>;
  db?: Database.Database;
  readonly?: boolean;
  // Accepts both the generic `defaultUseType` and `RefFieldProps['useType']`.
  useType?: (db?: Database.Database, typename?: string) => Type.AnyEntity | undefined;
};

const InlineForm = ({ reference, db, readonly, useType = defaultUseType }: InlineFormProps) => {
  const target = useAtomValue(useMemo(() => reference.atom, [reference]));
  const typename = target ? (Obj.getTypename(target) ?? undefined) : undefined;
  const typeFromRegistry = useType(db, typename);
  const targetType = (target && Obj.getType(target)) || typeFromRegistry;
  // Drop the ECHO `id` property (mirrors `ObjectProperties` via `withMetaTags`);
  // otherwise the nested form renders an "Id" field. Hidden fields
  // (`FormInputAnnotation.set(false)`) are already filtered by the field set.
  const formSchema = useMemo(() => (targetType ? omitId(Type.getSchema(targetType)) : undefined), [targetType]);
  const defaultValues = useMemo(() => (target ? { ...target } : {}), [target]);

  // `formSchema` is resolved at runtime (the referenced object's schema), so the
  // form's value type is not statically known here — `any` at this form-value
  // boundary mirrors `ObjectProperties`. Each changed path is written back to the
  // live target via `Obj.setValue`.
  const handleChange = useCallback(
    (values: any, { isValid, changed }: { isValid: boolean; changed: Record<SchemaEx.JsonPath, boolean> }) => {
      if (!isValid || !target) {
        return;
      }
      const changedPaths = (Object.keys(changed) as SchemaEx.JsonPath[]).filter((path) => changed[path]);
      if (changedPaths.length === 0) {
        return;
      }
      Obj.update(target, () => {
        for (const path of changedPaths) {
          const parts = SchemaEx.splitJsonPath(path);
          Obj.setValue(target, parts, Obj.getValue(values, parts));
        }
      });
    },
    [target],
  );

  if (!target || !formSchema) {
    return null;
  }

  return (
    <Form.Root db={db} schema={formSchema} defaultValues={defaultValues as any} onValuesChanged={handleChange}>
      <Form.Content>
        <Form.FieldSet collapsible readonly={readonly} />
      </Form.Content>
    </Form.Root>
  );
};
