//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { AST, type BaseObject, S, type PropertyKey, type FormatEnum } from '@dxos/echo-schema';
import { findNode, getDiscriminatedType, isDiscriminatedUnion, SimpleType } from '@dxos/effect';
import { IconButton, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { getSchemaProperties } from '@dxos/schema';

import { FormContent } from './FormContent';
import { type FormInputProps } from './FormContext';
import { InputHeader, type InputComponent } from './Input';
import { getInputComponent } from './factory';
import { translationKey } from '../../translations';

const padding = 'px-2';

// TODO(ZaymonFC): This should also take the component lookup as a prop.
type ArrayFieldProps<T extends BaseObject> = {
  name: PropertyKey<T>;
  type: SimpleType;
  array: true;
  label: string;
  ast: AST.AST;
  values: Record<string, any>;
  format?: FormatEnum;
  readonly?: boolean;
  placeholder?: string;
  inputProps: FormInputProps;
  Custom?: Partial<Record<string, InputComponent>>;
};

export const ArrayField = <T extends BaseObject>({
  name,
  type,
  label,
  ast,
  values,
  format,
  readonly,
  placeholder,
  inputProps,
  Custom,
}: ArrayFieldProps<T>) => {
  const { t } = useTranslation(translationKey);
  const arrayValues = (values[name] ?? []) as any[];
  const key = [name];

  // TODO(ZaymonFC): Should this unwrapping happen at a lower level?
  const tupleType = findNode(ast, AST.isTupleType);
  const elementType = (tupleType as AST.TupleType | undefined)?.rest[0]?.type;

  const handleAdd = () => {
    const newValue =
      type === 'object' && elementType ? getDefaultObjectValue(elementType) : SimpleType.getDefaultValue(type);
    inputProps.onValueChange(type, [...arrayValues, newValue]);
  };

  const handleRemove = (index: number) => {
    const newValues = arrayValues.filter((_, i) => i !== index);
    inputProps.onValueChange(type, newValues);
  };

  const getDefaultObjectValue = (typeNode: AST.AST): any => {
    const baseNode = findNode(typeNode, isDiscriminatedUnion);
    const typeLiteral = baseNode ? getDiscriminatedType(baseNode, {}) : findNode(typeNode, AST.isTypeLiteral);

    if (!typeLiteral) {
      return {};
    }

    return Object.fromEntries(getSchemaProperties(typeLiteral, {}).map((prop) => [prop.name, prop.defaultValue]));
  };

  if (type === 'object' && elementType) {
    const baseNode = findNode(elementType, isDiscriminatedUnion);
    const typeLiteral = baseNode
      ? getDiscriminatedType(baseNode, values[name] as any)
      : findNode(elementType, AST.isTypeLiteral);

    if (typeLiteral) {
      return (
        <div key={name} role='none' className={mx(padding)}>
          <InputHeader>{label}</InputHeader>
          <div role='none' className='flex flex-col gap-1'>
            {arrayValues.map((value, index) => (
              <div key={index} role='none' className='flex items-center gap-1'>
                <div role='none' className='flex-1'>
                  <FormContent
                    schema={S.make(typeLiteral)}
                    path={[...key, index.toString()]}
                    readonly={readonly}
                    Custom={Custom}
                  />
                </div>
                <IconButton
                  icon='ph--trash--regular'
                  iconOnly
                  label={t('button remove')}
                  onClick={() => handleRemove(index)}
                />
              </div>
            ))}
          </div>
          <div role='none' className='flex justify-between items-center plb-1'>
            <IconButton icon='ph--plus--regular' iconOnly label={t('button add')} onClick={handleAdd} />
          </div>
        </div>
      );
    }
    return (
      <div key={name} role='none'>
        Nested form not supported in arrays, yet.
      </div>
    );
  }

  const InputComponent = getInputComponent(type, format);
  if (!InputComponent) {
    return null;
  }

  return (
    <div role='none' key='meta-input' className={mx(padding)}>
      <InputHeader>{label}</InputHeader>
      <div role='none' className='flex flex-col gap-1'>
        {arrayValues.map((_, index) => (
          <div key={index} role='none' className='flex items-start gap-1'>
            <div role='none' className='flex-1'>
              <InputComponent
                type={type}
                format={format}
                label={label}
                inputOnly
                disabled={readonly}
                placeholder={placeholder}
                {...inputProps}
              />
            </div>
            <IconButton
              icon='ph--trash--regular'
              iconOnly
              label={t('button remove')}
              onClick={() => handleRemove(index)}
            />
          </div>
        ))}
      </div>
      <div role='none' className='flex justify-between items-center plb-1'>
        <IconButton icon='ph--plus--regular' iconOnly label={t('button add')} onClick={handleAdd} />
      </div>
    </div>
  );
};
