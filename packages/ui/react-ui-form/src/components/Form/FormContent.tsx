//
// Copyright 2024 DXOS.org
//

import { pipe } from 'effect';
import { capitalize } from 'effect/String';
import React, { useMemo } from 'react';

import { AST, Expando, getReferenceAnnotation, getTypeAnnotation, S, type TypeAnnotation } from '@dxos/echo-schema';
import { createJsonPath, findNode, getDiscriminatedType, isDiscriminatedUnion } from '@dxos/effect';
import { DXN } from '@dxos/keys';
import { refFromDXN, RefImpl } from '@dxos/live-object';
import { mx } from '@dxos/react-ui-theme';
import { getSchemaProperties, type SchemaProperty } from '@dxos/schema';
import { isNotFalsy } from '@dxos/util';

import { ArrayField } from './ArrayField';
import { SelectInput, TextInput } from './Defaults';
import { type ComponentLookup } from './Form';
import { useInputProps, useFormValues } from './FormContext';
import { type InputComponent } from './Input';
import { getInputComponent } from './factory';

export type FormFieldProps = {
  property: SchemaProperty<any>;
  path?: (string | number)[];
  readonly?: boolean;
  /** Used to indicate if input should be presented inline (e.g. for array items). */
  inline?: boolean;
  onQueryRefOptions?: (type: TypeAnnotation) => { dxn: DXN; label?: string }[];
  lookupComponent?: ComponentLookup;
  Custom?: Partial<Record<string, InputComponent>>;
};

export const FormField = ({
  property,
  path,
  readonly,
  inline,
  onQueryRefOptions,
  lookupComponent,
  Custom,
}: FormFieldProps) => {
  const inputProps = useInputProps(path);
  const { ast, name, type, format, title, description, options, examples, array } = property;

  const label = useMemo(() => title ?? pipe(name, capitalize), [title, name]);
  const placeholder = useMemo(
    () => (examples?.length ? `Example: "${examples[0]}"` : description),
    [examples, description],
  );

  const FoundComponent = lookupComponent?.({
    prop: name,
    schema: S.make(ast),
    inputProps: {
      type,
      format,
      label,
      disabled: readonly,
      placeholder,
      ...inputProps,
    },
  });

  if (FoundComponent) {
    return <div role='none'>{FoundComponent}</div>;
  }

  const jsonPath = createJsonPath(path ?? []);
  const CustomComponent = Custom?.[jsonPath];
  if (CustomComponent) {
    return (
      <CustomComponent
        type={type}
        format={format}
        label={label}
        inputOnly={inline}
        placeholder={placeholder}
        disabled={readonly}
        {...inputProps}
      />
    );
  }

  if (array) {
    return <ArrayField property={property} path={path} inputProps={inputProps} readonly={readonly} Custom={Custom} />;
  }

  const InputComponent = getInputComponent(type, format);
  if (InputComponent) {
    return (
      <div role='none'>
        <InputComponent
          type={type}
          format={format}
          label={label}
          inputOnly={inline}
          placeholder={placeholder}
          disabled={readonly}
          {...inputProps}
        />
      </div>
    );
  }

  if (options) {
    return (
      <div role='none'>
        <SelectInput
          type={type}
          format={format}
          disabled={readonly}
          inputOnly={inline}
          label={label}
          options={options.map((option) => ({ value: option, label: String(option) }))}
          placeholder={placeholder}
          {...inputProps}
        />
      </div>
    );
  }

  // TODO(ZaymonFC): Extract this to it's own component.
  if (format === 'ref') {
    const refTypeInfo = getReferenceAnnotation(S.make(ast));

    if (!refTypeInfo) {
      return null;
    }

    // If ref type is expando, fall back to taking a DXN in string format.
    if (refTypeInfo.typename === getTypeAnnotation(Expando)?.typename) {
      const { getValue, onValueChange, ...rest } = inputProps;

      const handleOnValueChange = (_type: any, dxnString: string) => {
        const dxn = DXN.tryParse(dxnString);
        if (dxn) {
          onValueChange?.('object', refFromDXN(dxn));
        } else if (dxnString === '') {
          onValueChange?.('object', undefined);
        } else {
          onValueChange?.('string', dxnString);
        }
      };

      const handleGetValue = () => {
        const formValue = getValue();
        if (typeof formValue === 'string') {
          return formValue;
        }
        if (formValue instanceof RefImpl) {
          return formValue.dxn.toString();
        }

        return undefined;
      };

      return (
        <TextInput
          type={type}
          label={label}
          disabled={readonly}
          placeholder={placeholder}
          inputOnly={inline}
          getValue={handleGetValue as <V>() => V | undefined}
          onValueChange={handleOnValueChange}
          {...rest}
        />
      );
    }

    if (!onQueryRefOptions) {
      return null;
    }

    const refOptions = onQueryRefOptions(refTypeInfo).map((option) => ({
      ...option,
      value: option.dxn.toString(),
    }));

    return (
      <SelectInput
        type={type}
        label={label}
        disabled={readonly}
        placeholder={placeholder}
        inputOnly={inline}
        {...inputProps}
        options={refOptions}
      />
    );
  }

  if (type === 'object') {
    const baseNode = findNode(ast, isDiscriminatedUnion);
    const typeLiteral = baseNode
      ? getDiscriminatedType(baseNode, inputProps.getValue() as any)
      : findNode(ast, AST.isTypeLiteral);

    if (typeLiteral) {
      return (
        <div role='none'>
          {!inline && <h3 className='text-lg mbs-2 mbe-1'>{label}</h3>}
          <FormFields
            schema={S.make(typeLiteral)}
            path={path}
            readonly={readonly}
            onQueryRefOptions={onQueryRefOptions}
            Custom={Custom}
            lookupComponent={lookupComponent}
          />
        </div>
      );
    }
  }

  return null;
};

export type FormContentProps = {
  schema: S.Schema.All;
  path?: (string | number)[];
  filter?: (props: SchemaProperty<any>[]) => SchemaProperty<any>[];
  sort?: string[];
  readonly?: boolean;
  onQueryRefOptions?: (type: TypeAnnotation) => { dxn: DXN; label?: string }[];
  lookupComponent?: ComponentLookup;
  Custom?: Partial<Record<string, InputComponent>>;
};

export const FormFields = ({
  schema,
  path,
  filter,
  sort,
  readonly,
  onQueryRefOptions,
  lookupComponent,
  Custom,
}: FormContentProps) => {
  const values = useFormValues(path);

  const properties = useMemo(() => {
    const props = getSchemaProperties(schema.ast, values);
    const filtered = filter ? filter(props) : props;

    return sort ? filtered.sort((a, b) => sort.indexOf(a.name) - sort.indexOf(b.name)) : filtered;
  }, [schema, values, filter, sort]);

  return (
    <div role='form' className={mx('flex flex-col w-full gap-2')}>
      {properties
        .map((property) => {
          return (
            <FormField
              key={property.name}
              property={property}
              path={[...(path ?? []), property.name]}
              readonly={readonly}
              onQueryRefOptions={onQueryRefOptions}
              lookupComponent={lookupComponent}
              Custom={Custom}
            />
          );
        })
        .filter(isNotFalsy)}
    </div>
  );
};
