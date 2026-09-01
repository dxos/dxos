//
// Copyright 2025 DXOS.org
//

// Form-input surfaces. Each consumes the whole surface envelope — the form renderer's own props ride
// alongside `data` — so they are registered without a `props` mapper.

import React, { useCallback } from 'react';

import { type Surface } from '@dxos/app-framework/ui';
import { type AppSurface, useTypeOptions } from '@dxos/app-toolkit/ui';
import { Database, Obj } from '@dxos/echo';
import { SchemaEx } from '@dxos/effect';
import { Input } from '@dxos/react-ui';
import { type FormFieldRendererProps, SelectField } from '@dxos/react-ui-form';
import { HuePicker, IconPicker } from '@dxos/react-ui-pickers';

import { type TypeInputOptions, TypeInputOptionsAnnotationId } from '../types/SpaceForm.ts';

/** The form renderer's own props ride alongside `data`; `type` comes from the field AST. */
export type SpaceFormFieldProps = Surface.ComponentProps<AppSurface.FormInputData> &
  Omit<FormFieldRendererProps, 'type'>;

export const HueField = ({ data, label, readonly, getValue, onValueChange }: SpaceFormFieldProps) => {
  const ast = data.fieldPropertyAst;
  const handleChange = useCallback((nextHue: string) => ast && onValueChange(ast, nextHue), [ast, onValueChange]);
  const handleReset = useCallback(() => ast && onValueChange(ast, undefined), [ast, onValueChange]);

  if (!ast) {
    return null;
  }

  return (
    <Input.Root>
      <Input.Label>{label}</Input.Label>
      <HuePicker disabled={!!readonly} value={getValue() ?? ''} onChange={handleChange} onReset={handleReset} />
    </Input.Root>
  );
};

export const IconField = ({ data, label, readonly, getValue, onValueChange }: SpaceFormFieldProps) => {
  const ast = data.fieldPropertyAst;
  const handleChange = useCallback((nextIcon: string) => ast && onValueChange(ast, nextIcon), [ast, onValueChange]);
  const handleReset = useCallback(() => ast && onValueChange(ast, undefined), [ast, onValueChange]);

  if (!ast) {
    return null;
  }

  return (
    <Input.Root>
      <Input.Label>{label}</Input.Label>
      <IconPicker disabled={!!readonly} value={getValue() ?? ''} onChange={handleChange} onReset={handleReset} />
    </Input.Root>
  );
};

export const TypenameField = ({ data, ...inputProps }: SpaceFormFieldProps) => {
  const ast = data.fieldPropertyAst;
  const target = data.target;
  const db = Database.isDatabase(target) ? target : Obj.isObject(target) ? Obj.getDatabase(target) : undefined;
  const annotation = SchemaEx.findAnnotation<TypeInputOptions>(data.schema.ast, TypeInputOptionsAnnotationId)!;
  const options = useTypeOptions({ db, annotation });

  if (!ast) {
    return null;
  }

  const props: FormFieldRendererProps = { ...inputProps, type: ast };

  return <SelectField {...props} options={options} />;
};
