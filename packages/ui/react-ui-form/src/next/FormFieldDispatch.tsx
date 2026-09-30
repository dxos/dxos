//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as String from 'effect/String';
import React, { type ReactNode, useMemo } from 'react';

import { Format } from '@dxos/echo';
import { SchemaAST, SchemaEx } from '@dxos/effect';
import { useTranslation } from '@dxos/react-ui';

import { translationKey } from '#translations';
import { type FormFieldRenderer, type FormFieldRendererProps } from '#types';

import {
  type FieldRendererResolution,
  type FormFieldDispatchProps,
  resolveFieldRenderer,
} from '../components/Form/FormField/FormFieldDispatch.tsx';
import { type FormFieldBinding } from '../components/Form/FormField/FormFieldContext.ts';
import * as Current from '../components/Form/FormField/fields/index.ts';
import { useFormFieldState } from '../hooks/index.ts';
import { FormFieldRow } from './FormField.tsx';
import { FormFields } from './FormFields.tsx';
import { FormFieldSet } from './FormFieldSet.tsx';
import {
  ArrayField,
  BooleanField,
  DateField,
  GeoPointField,
  NumberField,
  PasswordField,
  RefField,
  SelectField,
  TextAreaField,
  TextField,
} from './fields/index.ts';

/**
 * `resolveFieldRenderer` (shared with the current Form) answers a scalar with the current renderer component rather
 * than a key, so the next dispatcher maps each one to its Next counterpart; a renderer missing here is not ported yet.
 */
const SCALARS = new Map<FormFieldRenderer, FormFieldRenderer>([
  [Current.TextField, TextField],
  [Current.NumberField, NumberField],
  [Current.BooleanField, BooleanField],
  [Current.DateField, DateField],
  [Current.GeoPointField, GeoPointField],
  [Current.PasswordField, PasswordField],
  [Current.TextAreaField, TextAreaField],
]);

export type { FormFieldDispatchProps };

/** One schema property, rendered by the Next renderer for whatever `resolveFieldRenderer` picks. */
export const FormFieldDispatch = (props: FormFieldDispatchProps) => {
  const {
    type,
    name,
    label: labelProp,
    path,
    required,
    projection,
    fieldMap,
    fieldProvider,
    readonly,
    hideEmpty = true,
    layout,
    db,
    useType,
    getOptions,
    onCreate,
    resolveCreateEntry,
    refInline,
  } = props;
  const { t } = useTranslation(translationKey);
  const title = SchemaEx.getAnnotation<string>(SchemaAST.TitleAnnotationId)(type);
  const description = SchemaEx.getAnnotation<string>(SchemaAST.DescriptionAnnotationId)(type);
  const examples = SchemaEx.getAnnotation<string[]>(SchemaAST.ExamplesAnnotationId)(type);
  const label = useMemo(
    () => labelProp ?? title ?? (name == null ? '' : String.capitalize(name)),
    [labelProp, title, name],
  );
  const placeholder = useMemo(
    () => (examples?.length ? `${t('example.placeholder')}: ${examples[0]}` : (description ?? label)),
    [examples, description, label, t],
  );

  const fieldState = useFormFieldState(FormFieldDispatch.displayName, path);
  const jsonPath = SchemaEx.createJsonPath(path ?? []);
  const fieldProps: FormFieldRendererProps = {
    type,
    format: Format.FormatAnnotation.getFromAst(type).pipe((annotation) => Option.getOrUndefined(annotation)),
    readonly,
    label,
    description,
    jsonPath,
    placeholder,
    presentation: layout,
    required,
    db,
    ...fieldState,
  };

  if ((readonly || layout === 'static') && hideEmpty && fieldState.getValue() == null) {
    return null;
  }

  const resolution = resolveFieldRenderer({
    type,
    name,
    jsonPath,
    value: fieldState.getValue(),
    fieldMap,
    fieldProvider,
    fieldProps,
    refInline,
  });
  if (!resolution) {
    return null;
  }

  if (resolution.kind === 'custom') {
    const CustomField = resolution.component;
    return <CustomField {...fieldProps} />;
  }
  if (resolution.kind === 'provided') {
    return resolution.element;
  }
  if (resolution.kind === 'array') {
    return <ArrayField fieldProps={fieldState} label={label} {...props} />;
  }
  if (resolution.kind === 'object') {
    return (
      <FormFieldSet label={label} collapsible nested data-testid={`group.${jsonPath}`}>
        <FormFields
          schema={resolution.schema}
          path={path}
          readonly={readonly}
          layout={layout}
          projection={projection}
          fieldMap={fieldMap}
          fieldProvider={fieldProvider}
          db={db}
          useType={useType}
          getOptions={getOptions}
          onCreate={onCreate}
          resolveCreateEntry={resolveCreateEntry}
        />
      </FormFieldSet>
    );
  }

  const control = renderControl(resolution);
  if (control === undefined) {
    return null;
  }

  const { status, error } = fieldState.getStatus();
  const binding: FormFieldBinding = {
    path: jsonPath,
    type,
    value: fieldState.getValue(),
    setValue: (next) => fieldState.onValueChange(type, next),
    onBlur: fieldState.onBlur,
    status,
    error,
    required: fieldProps.required,
    readonly,
    presentation: layout,
  };
  const scalar = resolution.kind === 'scalar' ? SCALARS.get(resolution.component) : undefined;
  return (
    <FormFieldRow
      label={label}
      description={description}
      format={fieldProps.format}
      binding={binding}
      standalone={scalar?.standalone}
      labelPlacement={scalar?.labelPlacement}
      renderStatic={resolution.kind === 'select' ? renderSelectStatic(resolution.options) : undefined}
    >
      {control}
    </FormFieldRow>
  );

  function renderControl(resolution: FieldRendererResolution): ReactNode | undefined {
    switch (resolution.kind) {
      case 'scalar': {
        const ScalarField = SCALARS.get(resolution.component);
        return ScalarField ? <ScalarField {...fieldProps} /> : undefined;
      }
      case 'select':
        return <SelectField {...fieldProps} options={selectOptions(resolution.options)} />;
      case 'ref':
        return resolution.inline ? undefined : (
          <RefField
            {...fieldProps}
            {...resolution.refProps}
            db={db}
            useType={useType}
            getOptions={getOptions}
          />
        );
      // Lookup, autofill, hue and inline refs are not ported in the spike (SPIKE.md).
      default:
        return undefined;
    }
  }
};

FormFieldDispatch.displayName = 'Form.FieldDispatch';

const selectOptions = (options: Format.Options[]) =>
  options.map((option) => ({ value: option, label: option.toString() }));

const renderSelectStatic = (options: Format.Options[]) => (value: unknown) =>
  selectOptions(options).find((candidate) => candidate.value === value)?.label ?? globalThis.String(value ?? '');
