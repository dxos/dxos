//
// Copyright 2026 DXOS.org
//

import { type FC } from 'react';

import { createContext } from '@dxos/react-hooks';

import { type FormFieldsProps } from './property-walk.ts';
import { type FormFieldDispatchProps } from './resolve-field.ts';

// Fields that render fields (an array's items, an inline ref's form, a picker's create form) take the dispatcher from
// here rather than importing it: the dispatcher imports every field, so a static import back would be a cycle.

export type FormDispatch = {
  FormFieldDispatch: FC<FormFieldDispatchProps>;
  FormFields: FC<FormFieldsProps<any>>;
};

export const [FormDispatchProvider, useFormDispatch] = createContext<FormDispatch>('Form.Root');
