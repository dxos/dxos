//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';
import * as SchemaAST from 'effect/SchemaAST';
import React, { useCallback } from 'react';

import {
  createJsonPath,
  findNode,
  getArrayElementType,
  getDiscriminatedType,
  isDiscriminatedUnion,
  isNestedType,
} from '@dxos/effect';
import { IconButton, useTranslation } from '@dxos/react-ui';

import { translationKey } from '#translations';

import { getFormProperties } from '../../../util';
import { useFormValues } from '../Form';
import { FormField, type FormFieldProps } from '../FormField';
import { FormFieldLabel, type FormFieldStateProps } from '../FormFieldComponent';

export type ArrayFieldProps = {
  label: string;
  fieldProps: FormFieldStateProps;
} & FormFieldProps;

export const ArrayField = ({
  type,
  path,
  label,
  readonly,
  layout,
  fieldProps: inputProps,
  ...props
}: ArrayFieldProps) => {
  const { t } = useTranslation(translationKey);
  const elementType = getArrayElementType(type);
  const { onValueChange } = inputProps;
  const values = useFormValues(ArrayField.displayName, path, () => []);

  const getDefaultObjectValue = (typeNode: SchemaAST.AST): any => {
    const baseNode = findNode(typeNode, isDiscriminatedUnion);
    const typeLiteral = baseNode ? getDiscriminatedType(baseNode, {}) : findNode(typeNode, SchemaAST.isTypeLiteral);
    if (!typeLiteral) {
      return {};
    }

    return Object.fromEntries(
      getFormProperties(typeLiteral).map((prop) => {
        const defaultValue = SchemaAST.getDefaultAnnotation(prop.type).pipe((annotation) =>
          Option.getOrUndefined(annotation),
        );
        return [prop.name, defaultValue];
      }),
    );
  };

  const handleAdd = useCallback(() => {
    const defaultValue =
      isNestedType(type) && elementType ? getDefaultObjectValue(elementType) : getDefaultValue(elementType);
    values && onValueChange(type, [...values, defaultValue]);
  }, [onValueChange, type, elementType, values]);

  const handleDelete = useCallback(
    (idx: number) => {
      onValueChange(
        type,
        values?.filter((_, i) => i !== idx),
      );
    },
    [onValueChange, type, values],
  );

  if (!elementType || ((readonly || layout === 'static') && values && values.length < 1)) {
    return null;
  }

  // An array of objects (e.g. `repeated Signal`) can't share the
  // 2-column-with-delete row layout used for scalars: each object has
  // multiple fields that need their own (label, input) rows, so we render
  // each item as a recursively-laid-out FormField with the delete button on
  // its own row below. Scalar arrays keep the compact inline layout.
  const renderItemAsObject = elementType && isNestedType(elementType);

  return (
    <>
      {(layout !== 'static' || (values && values.length > 0)) && (
        <div className='flex items-center gap-2'>
          <div className='flex-1 min-w-0'>
            <FormFieldLabel readonly={readonly} label={label} path={createJsonPath(path ?? [])} asChild />
          </div>
          {!readonly && layout !== 'static' && (
            <IconButton iconOnly icon='ph--plus--regular' label={t('add-item.button')} onClick={handleAdd} />
          )}
        </div>
      )}

      <div className='flex flex-col'>
        {values?.map((_, index) => {
          if (renderItemAsObject) {
            return (
              <div key={index} className='flex flex-col'>
                <FormField
                  autoFocus={index === values.length - 1}
                  type={elementType}
                  path={[...(path ?? []), index]}
                  readonly={readonly || layout === 'static'}
                  layout={layout === 'static' ? 'static' : undefined}
                  {...props}
                />
                {!readonly && layout !== 'static' && (
                  <IconButton
                    classNames='flex w-full mt-form-gap'
                    icon='ph--x--regular'
                    label={t('remove-item.button')}
                    onClick={() => handleDelete(index)}
                  />
                )}
              </div>
            );
          }

          return (
            <div key={index} className='grid grid-cols-[1fr_min-content] gap-form-gap last:mb-form-gap items-center'>
              <FormField
                autoFocus={index === values.length - 1}
                type={elementType}
                path={[...(path ?? []), index]}
                readonly={readonly || layout === 'static'}
                layout='inline'
                {...props}
              />

              {!readonly && layout !== 'static' && (
                <div className='flex flex-col h-full justify-end'>
                  {/* NOTE: Aligns with center of last field if multi-field object. */}
                  <div className='flex items-center h-[2rem]'>
                    <IconButton
                      icon='ph--x--regular'
                      iconOnly
                      label={t('remove.button')}
                      onClick={() => handleDelete(index)}
                      classNames='self-center'
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
};

ArrayField.displayName = 'Form.ArrayField';

/**
 * Returns the default empty value for a given AST.
 * Used for initializing new array values etc.
 */
// TODO(wittjosiah): Factor out?
export const getDefaultValue = (ast?: SchemaAST.AST): any => {
  switch (ast?._tag) {
    case 'StringKeyword': {
      return '';
    }
    case 'NumberKeyword': {
      return 0;
    }
    case 'BooleanKeyword': {
      return false;
    }
    case 'Suspend': {
      return getDefaultValue(ast.f());
    }
    default: {
      if (ast && isNestedType(ast)) {
        return {};
      } else {
        throw new Error(`Unsupported type: ${ast?._tag}`);
      }
    }
  }
};
