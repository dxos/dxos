//
// Copyright 2023 DXOS.org
//

import { createContextScope, Scope } from '@radix-ui/react-context';
import React, { PropsWithChildren } from 'react';

import { useId } from '@dxos/react-hooks';

const INPUT_NAME = 'Input';

type InputScopedProps<P> = P & { __inputScope?: Scope };

type InputRootProps = PropsWithChildren<{ id?: string }>;

const [createInputContext, createInputScope] = createContextScope(INPUT_NAME, []);

type InputContextValue = { id: string };

const [InputProvider, useInputContext] = createInputContext<InputContextValue>(INPUT_NAME);

const Root = ({ id: propsId, __inputScope, children }: InputScopedProps<InputRootProps>) => {
  const id = useId('input', propsId);
  return (
    <InputProvider id={id} scope={__inputScope}>
      {children}
    </InputProvider>
  );
};

export { Root, Root as InputRoot, createInputScope, useInputContext, INPUT_NAME };

export type { InputRootProps, InputScopedProps };
