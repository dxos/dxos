//
// Copyright 2025 DXOS.org
//

import { pipe } from 'effect';
import { capitalize } from 'effect/String';
import React from 'react';

import { AST } from '@dxos/echo-schema';
import { findNode, getDiscriminatedType, isDiscriminatedUnion, SimpleType } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { IconButton, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { getSchemaProperties, type SchemaProperty } from '@dxos/schema';

import { type ComponentLookup } from './Form';
import { FormField } from './FormContent';
import { useFormValues, type FormInputStateProps } from './FormContext';
import { InputHeader, type InputComponent } from './Input';
import { translationKey } from '../../translations';

const padding = 'px-2';

type ArrayFieldProps = {
  property: SchemaProperty<any>;
  readonly?: boolean;
  inputProps: FormInputStateProps;
  path?: (string | number)[];
  Custom?: Partial<Record<string, InputComponent>>;
  lookupComponent?: ComponentLookup;
};

export const ArrayField = ({ property, readonly, path, inputProps, Custom, lookupComponent }: ArrayFieldProps) => {
  const { t } = useTranslation(translationKey);
  const { ast, name, type, title } = property;
  const values = useFormValues(path ?? []) as any[];
  invariant(Array.isArray(values), 'Expected array values');
  const label = title ?? pipe(name, capitalize);

  const tupleType = findNode(ast, AST.isTupleType);
  const elementType = (tupleType as AST.TupleType | undefined)?.rest[0]?.type;

  // Consider getting values here istead of it being passed in.

  const getDefaultObjectValue = (typeNode: AST.AST): any => {
    const baseNode = findNode(typeNode, isDiscriminatedUnion);
    const typeLiteral = baseNode ? getDiscriminatedType(baseNode, {}) : findNode(typeNode, AST.isTypeLiteral);

    if (!typeLiteral) {
      return {};
    }

    return Object.fromEntries(getSchemaProperties(typeLiteral, {}).map((prop) => [prop.name, prop.defaultValue]));
  };

  const handleAdd = () => {
    const newValue =
      type === 'object' && elementType ? getDefaultObjectValue(elementType) : SimpleType.getDefaultValue(type);
    inputProps.onValueChange(type, [...values, newValue]);
  };

  const handleRemove = (index: number) => {
    const newValues = values.filter((_, i) => i !== index);
    inputProps.onValueChange(type, newValues);
  };

  if (!elementType) {
    return <div>Missing element type</div>;
  }

  return (
    <div role='none' className={mx(padding)}>
      <InputHeader>{label}</InputHeader>
      <div role='none' className='flex flex-col gap-1'>
        {values.map((_value, index) => (
          <div key={index} role='none' className='flex items-center gap-1'>
            <div role='none' className='flex-1'>
              <FormField
                property={{
                  ...property,
                  array: false, // NOTE(ZaymonFC): This breaks arrays of arrays but ¯\_(ツ)_/¯. Ping me if you need that.
                  ast: elementType,
                }}
                path={[...(path ?? []), index]}
                readonly={readonly}
                inline
                Custom={Custom}
                lookupComponent={lookupComponent}
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
