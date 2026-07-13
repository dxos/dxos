//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import React, { useCallback, useMemo } from 'react';

import { type Database, Obj, Ref, Type } from '@dxos/echo';
import { useType as defaultUseType } from '@dxos/echo-react';
import { ReferenceAnnotationId, type ReferenceAnnotationValue } from '@dxos/echo/Annotation';
import { SchemaEx } from '@dxos/effect';
import { DXN, URI } from '@dxos/keys';
import { IconButton, Input, useTranslation } from '@dxos/react-ui';

import { translationKey } from '#translations';

import { omitId } from '../../../../../util';
import { FormContent, FormFieldSetContainer, FormRoot } from '../../../FormControls';
import { FormFieldLabel } from '../../FormRow';
import { presentationFor } from '../../presentation';
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
    presentation,
    required,
    db,
    getValue,
    onValueChange,
    onCreate,
    useType = defaultUseType,
  } = props;
  const { t } = useTranslation(translationKey);
  const resolved = presentationFor(presentation);

  const reference = getValue() as Ref.Ref<any> | undefined;
  const typename = useMemo(
    () => (type ? SchemaEx.findAnnotation<ReferenceAnnotationValue>(type, ReferenceAnnotationId)?.typename : undefined),
    [type],
  );

  // Empty ref: offer to create the referenced object so the inline form has a target.
  const createType = useType(db, typename ? DXN.make(typename) : undefined);
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
      {resolved.showLabel && <FormFieldLabel readonly={readonly} required={required} label={label} path={jsonPath} />}
      {reference ? (
        <InlineForm reference={reference} db={db} readonly={readonly} useType={useType} />
      ) : (
        !readonly &&
        onCreate && (
          <IconButton
            classNames='w-full gap-form-gap'
            disabled={!createType || !db}
            icon='ph--plus--regular'
            label={label || t('ref-field.placeholder')}
            onClick={() => void handleCreate()}
          />
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
  useType?: (db?: Database.Database, typeUri?: URI.URI) => Type.AnyEntity | undefined;
};

const InlineForm = ({ reference, db, readonly, useType = defaultUseType }: InlineFormProps) => {
  const target = useAtomValue(useMemo(() => reference.atom, [reference]));
  const typeUri = target ? Obj.getTypeURI(target) : undefined;
  const typeFromRegistry = useType(db, typeUri);
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
    <FormRoot db={db} schema={formSchema} defaultValues={defaultValues as any} onValuesChanged={handleChange}>
      <FormContent>
        <FormFieldSetContainer collapsible readonly={readonly} />
      </FormContent>
    </FormRoot>
  );
};
