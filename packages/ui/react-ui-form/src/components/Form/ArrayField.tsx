//
// Copyright 2025 DXOS.org
//

import { SchemaAST, pipe } from 'effect';
import { capitalize } from 'effect/String';
import React, { Fragment, useCallback } from 'react';

import { findNode, getDiscriminatedType, isDiscriminatedUnion, SimpleType } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { IconButton, useTranslation } from '@dxos/react-ui';
import { getSchemaProperties, type SchemaProperty } from '@dxos/schema';

import { type ComponentLookup } from './Form';
import { FormField } from './FormContent';
import { useFormValues, type FormInputStateProps } from './FormContext';
import { InputHeader, type InputComponent } from './Input';
import { translationKey } from '../../translations';
import { findArrayElementType } from '../../util';

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

  return readonly && values.length < 1 ? null : (
    <>
      <InputHeader readonly label={label} />
      <div
        role='none'
        className={
          readonly
            ? 'flex flex-wrap gap-1 mlb-1'
            : values.length > 0
              ? 'grid gap-1 grid-cols-[1fr_min-content] mlb-1'
              : 'hidden'
        }
      >
        {values.map((_value, index) => {
          const field = (
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
          );
          return readonly ? (
            field
          ) : (
            <Fragment key={index}>
              <div role='none'>{field}</div>
              <IconButton
                icon='ph--trash--regular'
                iconOnly
                label={t('button remove')}
                onClick={() => handleRemove(index)}
                classNames='self-center'
              />
            </Fragment>
          );
        })}
      </div>
      {!readonly && (
        <IconButton
          classNames='is-full mlb-cardSpacingBlock flex'
          icon='ph--plus--regular'
          label={t('add field')}
          onClick={handleAdd}
        />
      )}
    </>
  );
};
