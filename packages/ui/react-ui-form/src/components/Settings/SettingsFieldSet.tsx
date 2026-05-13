//
// Copyright 2025 DXOS.org
//

import * as SchemaAST from 'effect/SchemaAST';
import * as String from 'effect/String';
import React, { useCallback, useMemo } from 'react';

import { getAnnotation, type SchemaProperty } from '@dxos/effect';
import { Input, Select } from '@dxos/react-ui';

import { getFormProperties, type SelectOption, detectFieldType, getSelectOptionsFromAst } from '../../util';
import { SettingsItem } from './SettingsItem';

//
// Types
//

/**
 * Props for a custom field renderer.
 * The renderer provides the control only; SettingsItem wrapper is handled by FieldSet.
 */
export type SettingsFieldProps<T = any> = {
  value: T;
  onChange: (value: T) => void;
  readonly?: boolean;
};

/**
 * Map of property names to either a custom field renderer or a nested field map for struct fields.
 * When a value type `T` is provided, the map shape is checked against the schema's value type.
 */
export type SettingsFieldMap<T extends Record<string, any> = Record<string, any>> = {
  [K in keyof T]?: NonNullable<T[K]> extends Record<string, any>
    ? SettingsFieldMap<NonNullable<T[K]>>
    : React.FC<SettingsFieldProps<T[K]>>;
};

export type SettingsFieldSetProps<T extends Record<string, any> = Record<string, any>> = {
  /** Effect Schema for the settings object. */
  schema: { ast: SchemaAST.AST };

  /** Current settings values. */
  values: T;

  /** Callback when any value changes. Receives a new complete object. */
  onValuesChanged?: (values: T) => void;

  /** When true, all controls are disabled. */
  readonly?: boolean;

  /** Map of property names to custom field renderers. Nested objects map to struct sub-fields. */
  fieldMap?: SettingsFieldMap<T>;

  /** Control field visibility. Receives the dotted path (e.g. `'modelDefaults.edge'`) at every level. */
  visible?: (path: string, values: T) => boolean;

  /** Override the order of fields. Fields not listed are appended in schema order. Applied per scope. */
  sort?: string[];

  /** Internal: dot-path prefix used by recursive struct rendering. */
  pathPrefix?: string;
};

//
// Component
//

export const SettingsFieldSet = <T extends Record<string, any>>({
  schema,
  values,
  onValuesChanged,
  readonly,
  fieldMap,
  visible,
  sort,
  pathPrefix = '',
}: SettingsFieldSetProps<T>) => {
  const properties = useMemo(() => {
    const props = getFormProperties(schema.ast);
    if (!sort) {
      return props;
    }
    const rank = (name: string) => {
      const idx = sort.indexOf(name);
      return idx === -1 ? Number.POSITIVE_INFINITY : idx;
    };
    return [...props].sort(({ name: a }, { name: b }) => rank(a.toString()) - rank(b.toString()));
  }, [schema, sort]);

  const handleChange = useCallback(
    (name: string, value: unknown) => {
      onValuesChanged?.({ ...values, [name]: value } as T);
    },
    [values, onValuesChanged],
  );

  return (
    <>
      {properties.map((property) => {
        const name = property.name.toString();
        const path = pathPrefix ? `${pathPrefix}.${name}` : name;
        if (visible && !visible(path, values)) {
          return null;
        }

        const entry = fieldMap?.[name as keyof typeof fieldMap] as
          | React.FC<SettingsFieldProps>
          | SettingsFieldMap
          | undefined;
        return (
          <SettingsFieldItem
            key={name}
            path={path}
            property={property}
            value={values[name]}
            onChange={(value) => handleChange(name, value)}
            readonly={readonly}
            customField={typeof entry === 'function' ? entry : undefined}
            nestedFieldMap={typeof entry === 'object' ? entry : undefined}
            visible={visible as (path: string, values: any) => boolean}
            sort={sort}
          />
        );
      })}
    </>
  );
};

SettingsFieldSet.displayName = 'Settings.FieldSet';

//
// Internal: render a single settings field.
//

type SettingsFieldItemProps = {
  property: SchemaProperty;
  path: string;
  value: any;
  onChange: (value: any) => void;
  readonly?: boolean;
  customField?: React.FC<SettingsFieldProps>;
  nestedFieldMap?: SettingsFieldMap;
  visible?: (path: string, values: any) => boolean;
  sort?: string[];
};

const SettingsFieldItem = ({
  property,
  path,
  value,
  onChange,
  readonly,
  customField,
  nestedFieldMap,
  visible,
  sort,
}: SettingsFieldItemProps) => {
  const { type } = property;
  const name = property.name.toString();
  const title = getAnnotation<string>(SchemaAST.TitleAnnotationId)(type) ?? String.capitalize(name);
  const description = getAnnotation<string>(SchemaAST.DescriptionAnnotationId)(type);

  // Custom field renderer.
  if (customField) {
    const CustomField = customField;
    return (
      <SettingsItem title={title} description={description}>
        <CustomField value={value} onChange={onChange} readonly={readonly} />
      </SettingsItem>
    );
  }

  const fieldType = detectFieldType(type);

  switch (fieldType) {
    case 'struct':
      return (
        <SettingsFieldSet
          schema={{ ast: type }}
          values={value ?? {}}
          onValuesChanged={onChange}
          readonly={readonly}
          fieldMap={nestedFieldMap}
          visible={visible}
          sort={sort}
          pathPrefix={path}
        />
      );

    case 'boolean':
      return (
        <SettingsItem title={title} description={description}>
          <Input.Switch disabled={readonly} checked={!!value} onCheckedChange={(checked) => onChange(!!checked)} />
        </SettingsItem>
      );

    case 'select': {
      const options = getSelectOptionsFromAst(type) ?? [];
      return (
        <SettingsItem title={title} description={description}>
          <Select.Root
            disabled={readonly}
            value={value == null ? '' : globalThis.String(value)}
            onValueChange={(selected) => {
              const matched = options.find((option) => globalThis.String(option.value) === selected);
              onChange(matched?.value ?? selected);
            }}
          >
            <Select.TriggerButton disabled={readonly} />
            <Select.Portal>
              <Select.Content>
                <Select.Viewport>
                  {options.map((option: SelectOption) => (
                    <Select.Option key={globalThis.String(option.value)} value={globalThis.String(option.value)}>
                      {option.label ?? globalThis.String(option.value)}
                    </Select.Option>
                  ))}
                </Select.Viewport>
                <Select.Arrow />
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </SettingsItem>
      );
    }

    case 'string':
      return (
        <SettingsItem title={title} description={description}>
          <Input.TextInput disabled={readonly} value={value ?? ''} onChange={(event) => onChange(event.target.value)} />
        </SettingsItem>
      );

    case 'number':
      return (
        <SettingsItem title={title} description={description}>
          <Input.TextInput
            disabled={readonly}
            type='number'
            value={value ?? ''}
            onChange={(event) => {
              if (event.target.value === '') {
                onChange(undefined);
                return;
              }
              const parsed = Number(event.target.value);
              onChange(Number.isNaN(parsed) ? undefined : parsed);
            }}
          />
        </SettingsItem>
      );

    default:
      return null;
  }
};
