//
// Copyright 2025 DXOS.org
//

import * as SchemaAST from 'effect/SchemaAST';
import * as String from 'effect/String';
import React, { useCallback, useMemo } from 'react';

import { getAnnotation, type SchemaProperty } from '@dxos/effect';
import { Input, Select } from '@dxos/react-ui';

import { getFormProperties } from '../../util';
import { type SelectOption, detectFieldType, getSelectOptionsFromAst } from '../../util/field-type';
import { Settings } from './Settings';

//
// Types
//

/**
 * Props for a custom field renderer.
 * The renderer provides the control only; Settings.Item wrapper is handled by FieldSet.
 */
export type SettingsFieldProps<T = any> = {
  value: T;
  onChange: (value: T) => void;
  readonly?: boolean;
};

/**
 * Map of property names to custom field renderers.
 */
export type SettingsFieldMap = Record<string, React.FC<SettingsFieldProps>>;

export type SettingsFieldSetProps<T extends Record<string, any> = Record<string, any>> = {
  /** Effect Schema for the settings object. */
  schema: { ast: SchemaAST.AST };

  /** Current settings values. */
  values: T;

  /** Callback when any value changes. Receives a new complete object. */
  onValuesChanged?: (values: T) => void;

  /** When true, all controls are disabled. */
  readonly?: boolean;

  /** Map of property names to custom field renderers. */
  fieldMap?: SettingsFieldMap;

  /** Control field visibility. Return false to hide a field. */
  visible?: (path: string, values: T) => boolean;

  /** Override the order of fields. Fields not listed are appended in schema order. */
  sort?: string[];
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
}: SettingsFieldSetProps<T>) => {
  const properties = useMemo(() => {
    const props = getFormProperties(schema.ast);
    if (!sort) {
      return props;
    }
    return [...props].sort(
      ({ name: a }, { name: b }) => (sort.indexOf(a.toString()) ?? Infinity) - (sort.indexOf(b.toString()) ?? Infinity),
    );
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
        if (visible && !visible(name, values)) {
          return null;
        }

        return (
          <SettingsFieldItem
            key={name}
            property={property}
            value={values[name]}
            onChange={(value) => handleChange(name, value)}
            readonly={readonly}
            customField={fieldMap?.[name]}
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
  value: any;
  onChange: (value: any) => void;
  readonly?: boolean;
  customField?: React.FC<SettingsFieldProps>;
};

const SettingsFieldItem = ({ property, value, onChange, readonly, customField }: SettingsFieldItemProps) => {
  const { type } = property;
  const name = property.name.toString();
  const title = getAnnotation<string>(SchemaAST.TitleAnnotationId)(type) ?? String.capitalize(name);
  const description = getAnnotation<string>(SchemaAST.DescriptionAnnotationId)(type);

  // Custom field renderer.
  if (customField) {
    const CustomField = customField;
    return (
      <Settings.Item title={title} description={description}>
        <CustomField value={value} onChange={onChange} readonly={readonly} />
      </Settings.Item>
    );
  }

  const fieldType = detectFieldType(type);

  switch (fieldType) {
    case 'boolean':
      return (
        <Settings.Item title={title} description={description}>
          <Input.Switch disabled={readonly} checked={!!value} onCheckedChange={(checked) => onChange(!!checked)} />
        </Settings.Item>
      );

    case 'select': {
      const options = getSelectOptionsFromAst(type) ?? [];
      return (
        <Settings.Item title={title} description={description}>
          <Select.Root disabled={readonly} value={value ?? ''} onValueChange={onChange}>
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
        </Settings.Item>
      );
    }

    case 'string':
      return (
        <Settings.Item title={title} description={description}>
          <Input.TextInput disabled={readonly} value={value ?? ''} onChange={(event) => onChange(event.target.value)} />
        </Settings.Item>
      );

    case 'number':
      return (
        <Settings.Item title={title} description={description}>
          <Input.TextInput
            disabled={readonly}
            type='number'
            value={value ?? ''}
            onChange={(event) => {
              const parsed = Number(event.target.value);
              onChange(Number.isNaN(parsed) ? undefined : parsed);
            }}
          />
        </Settings.Item>
      );

    default:
      return null;
  }
};
