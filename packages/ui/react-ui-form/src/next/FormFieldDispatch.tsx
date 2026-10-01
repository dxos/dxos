//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as String from 'effect/String';
import React, { type ReactNode, useMemo } from 'react';

import { Annotation, Format } from '@dxos/echo';
import { type AnyProperties } from '@dxos/echo/internal';
import { SchemaAST, SchemaEx } from '@dxos/effect';
import { useTranslation } from '@dxos/react-ui';

import { translationKey } from '#translations';
import { type FormFieldRenderer, type FormFieldRendererProps } from '#types';

import * as Current from '../components/Form/FormField/fields/index.ts';
import { FormFieldErrorBoundary } from '../components/Form/FormField/FormField.tsx';
import { type FormFieldBinding } from '../components/Form/FormField/FormFieldContext.ts';
import {
  type FieldRendererResolution,
  type FormFieldDispatchProps,
  resolveFieldRenderer,
} from '../components/Form/FormField/FormFieldDispatch.tsx';
import {
  type FormFieldsProps,
  toPathSegments,
  useFormFieldsProperties,
} from '../components/Form/FormFields/FormFields.tsx';
import { useFormContext, useFormFieldState, useFormValues } from '../hooks/index.ts';
import { getSchemaAtPath } from '../util/index.ts';
import {
  ArrayField,
  AsyncSelectField,
  AutofillField,
  BooleanField,
  ComboboxField,
  DateField,
  GeoPointField,
  HueField,
  InlineRefField,
  NumberField,
  PasswordField,
  RefField,
  SelectField,
  TextAreaField,
  TextField,
} from './fields/index.ts';
import { FormFieldRow } from './FormField.tsx';
import { FormFieldSet } from './FormFieldSet.tsx';
import { FormLayout } from './FormLayout.tsx';

/**
 * `resolveFieldRenderer` (shared with the current Form) answers a scalar with the current renderer component rather
 * than a key, so the next dispatcher maps each one to its Next counterpart; a renderer missing here is not ported yet.
 * A function, not a module-level table, so nothing imported is read while the modules of this recursion evaluate.
 */
const nextScalar = (component: FormFieldRenderer): FormFieldRenderer | undefined => {
  switch (component) {
    case Current.TextField:
      return TextField;
    case Current.NumberField:
      return NumberField;
    case Current.BooleanField:
      return BooleanField;
    case Current.DateField:
      return DateField;
    case Current.GeoPointField:
      return GeoPointField;
    case Current.PasswordField:
      return PasswordField;
    case Current.TextAreaField:
      return TextAreaField;
    default:
      return undefined;
  }
};

export type { FormFieldDispatchProps, FormFieldsProps };

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

  if (resolution.kind === 'ref' && resolution.inline) {
    return <InlineRefField {...fieldProps} db={db} useType={useType} onCreate={onCreate} />;
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
  const scalar = resolution.kind === 'scalar' ? nextScalar(resolution.component) : undefined;
  return (
    <FormFieldRow
      label={label}
      description={description}
      format={fieldProps.format}
      binding={binding}
      standalone={scalar?.standalone}
      labelPlacement={scalar?.labelPlacement}
      renderStatic={resolution.kind === 'select' ? renderSelectStatic(resolution.options, projection, name) : undefined}
    >
      {control}
    </FormFieldRow>
  );

  function renderControl(resolution: FieldRendererResolution): ReactNode | undefined {
    switch (resolution.kind) {
      case 'scalar': {
        const ScalarField = nextScalar(resolution.component);
        return ScalarField ? <ScalarField {...fieldProps} /> : undefined;
      }
      case 'select':
        return <SelectField {...fieldProps} options={selectOptions(resolution.options, projection, name)} />;
      case 'lookup':
        return resolution.combobox ? (
          <ComboboxField {...fieldProps} lookup={resolution.lookup} />
        ) : (
          <AsyncSelectField {...fieldProps} lookup={resolution.lookup} />
        );
      case 'autofill':
        return <AutofillField {...fieldProps} autofill={resolution.autofill} />;
      case 'hue':
        return <HueField {...fieldProps} />;
      case 'ref':
        return (
          <RefField
            {...fieldProps}
            {...resolution.refProps}
            db={db}
            useType={useType}
            getOptions={getOptions}
            onCreate={onCreate}
            resolveCreateEntry={resolveCreateEntry}
          />
        );
      default:
        return undefined;
    }
  }
};

FormFieldDispatch.displayName = 'Form.FieldDispatch';

/** The literal options, labelled by the projection's option titles where it has them. */
const selectOptions = (
  options: Format.Options[],
  projection: FormFieldDispatchProps['projection'],
  name: string | null,
) => {
  const titles = projection?.getFieldProjections().find((candidate) => candidate.field.path === name)?.props.options;
  return options.map((option) => ({
    value: option,
    label: titles?.find((candidate) => candidate.id === globalThis.String(option))?.title ?? option.toString(),
  }));
};

const renderSelectStatic =
  (options: Format.Options[], projection: FormFieldDispatchProps['projection'], name: string | null) =>
  (value: unknown) =>
    selectOptions(options, projection, name).find((candidate) => candidate.value === value)?.label ??
    globalThis.String(value ?? '');

//
// Fields
//

const FORM_FIELDS_NAME = 'Form.Fields';

/**
 * Walks the schema at `path`: one row per property, a nested group per object. Renders no element of its own, so its
 * rows are direct children of the enclosing grid. The layout DSL (`Form.Layout`) is out of the spike's scope.
 */
export const FormFields = ({
  path: pathProp,
  include,
  exclude,
  sort,
  filter,
  schema: schemaProp,
  layoutName = Annotation.DEFAULT_LAYOUT_NAME,
  ...props
}: FormFieldsProps<any>) => {
  const { form, variant: _variant, testId: _testId, ...contextProps } = useFormContext(FORM_FIELDS_NAME);
  const path = useMemo(() => toPathSegments(pathProp), [typeof pathProp === 'string' ? pathProp : pathProp?.join('.')]);
  const values = useFormValues<AnyProperties>(FORM_FIELDS_NAME, path);
  const { readonly, layout, projection, ...fieldContext } = { ...contextProps, ...props };
  const schema = useMemo(() => {
    if (schemaProp) {
      return schemaProp;
    }
    if (!form.schema) {
      return undefined;
    }
    const ast = path.length ? getSchemaAtPath(form.schema.ast, path, form.values) : form.schema.ast;
    return ast ? Schema.make<Schema.Codec<any, any>>(ast) : undefined;
    // The AST at a path changes only with the discriminator value it depends on, which `values` carries.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schemaProp, form.schema, path, values]);
  const properties = useFormFieldsProperties({ schema, values, include, exclude, filter, sort, projection });
  if ((readonly || layout === 'static') && values == null) {
    return null;
  }

  // A schema carrying a layout template renders by the DSL instead of one row per property.
  const layouts = schema ? Option.getOrUndefined(Annotation.FormLayoutAnnotation.get(schema)) : undefined;
  if (schema && layouts?.[layoutName] !== undefined) {
    return (
      <FormLayout
        schema={schema}
        name={layoutName}
        path={path}
        readonly={readonly}
        layout={layout}
        projection={projection}
        {...fieldContext}
      />
    );
  }

  return (
    <>
      {properties.map((property) => {
        const name = property.name.toString();
        return (
          <FormFieldErrorBoundary key={name} path={[...path, name]}>
            <FormFieldDispatch
              type={property.type}
              name={name}
              path={[...path, name]}
              required={!property.isOptional}
              readonly={readonly}
              layout={layout}
              projection={projection}
              {...fieldContext}
            />
          </FormFieldErrorBoundary>
        );
      })}
    </>
  );
};

FormFields.displayName = FORM_FIELDS_NAME;
