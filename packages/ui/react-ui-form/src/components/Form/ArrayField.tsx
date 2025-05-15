//
// Copyright 2025 DXOS.org
//

import { SchemaAST, pipe } from 'effect';
import { capitalize } from 'effect/String';
import React, { useCallback } from 'react';

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
import { findArrayElementType } from '../../util';

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
  // TODO(wittjosiah): The fallback to an empty array stops the form from crashing but isn't immediately live.
  //  It doesn't become live until another field is touched, but that's better than the whole form crashing.
  const values = (useFormValues(path ?? []) ?? []) as any[];
  invariant(Array.isArray(values), `Values at path ${path?.join('.')} must be an array.`);
  const label = title ?? pipe(name, capitalize);

  const elementType = findArrayElementType(ast);

  const getDefaultObjectValue = (typeNode: SchemaAST.AST): any => {
    const baseNode = findNode(typeNode, isDiscriminatedUnion);
    const typeLiteral = baseNode ? getDiscriminatedType(baseNode, {}) : findNode(typeNode, SchemaAST.isTypeLiteral);
    if (!typeLiteral) {
      return {};
    }

    return Object.fromEntries(getSchemaProperties(typeLiteral, {}).map((prop) => [prop.name, prop.defaultValue]));
  };

  const getDefaultValue = () =>
    type === 'object' && elementType ? getDefaultObjectValue(elementType) : SimpleType.getDefaultValue(type);

  const handleAdd = useCallback(() => {
    inputProps.onValueChange(type, [...values, getDefaultValue()]);
  }, [type, elementType, inputProps, values]);

  const handleRemove = useCallback(
    (index: number) => {
      const newValues = values.filter((_, i) => i !== index);
      inputProps.onValueChange(type, newValues);
    },
    [type, inputProps, values],
  );

  if (!elementType) {
    return null;
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
