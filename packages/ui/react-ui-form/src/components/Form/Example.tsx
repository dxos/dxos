//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

//
// Context
//

type FormContextValue = {};

const [FormContextProvider, useFormContext] = createContext<FormContextValue>('Form');

//
// Root
//

type FormRootProps = PropsWithChildren<{}>;

const FormRoot = ({ children }: FormRootProps) => {
  return <FormContextProvider>{children}</FormContextProvider>;
};

FormRoot.displayName = 'Form.Root';

//
// Content
//

type FormContentProps = ThemedClassName<{}>;

const FormContent = ({ classNames }: FormContentProps) => {
  const context = useFormContext(FormContent.displayName);
  return <div className={mx(classNames)}>{JSON.stringify(context)}</div>;
};

FormContent.displayName = 'Form.Content';

//
// Form
// https://www.radix-ui.com/primitives/docs/guides/composition
//

export const Form = {
  Root: FormRoot,
  Content: FormContent,
};

export type { FormRootProps, FormContentProps };
