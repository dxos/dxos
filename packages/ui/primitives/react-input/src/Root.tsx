//
// Copyright 2023 DXOS.org
//

import { createContextScope, Scope } from '@radix-ui/react-context';
import React, { PropsWithChildren } from 'react';

import { useId } from '@dxos/react-hooks';

const INPUT_NAME = 'Input';

type Valence = 'success' | 'info' | 'warning' | 'error' | 'neutral';

type InputScopedProps<P> = P & { __inputScope?: Scope };

type InputRootProps = PropsWithChildren<{ id?: string; validationValence?: Valence }>;

const [createInputContext, createInputScope] = createContextScope(INPUT_NAME, []);

type InputContextValue = {
  id: string;
  descriptionId: string;
  errorMessageId: string;
  validationValence: Valence;
};

const [InputProvider, useInputContext] = createInputContext<InputContextValue>(INPUT_NAME);

const InputRoot = ({
  id: propsId,
  validationValence = 'neutral',
  __inputScope,
  children
}: InputScopedProps<InputRootProps>) => {
  const id = useId('input', propsId);
  const descriptionId = useId('input__description');
  const errorMessageId = useId('input__error-message');
  return (
    <InputProvider {...{ id, descriptionId, errorMessageId, validationValence }} scope={__inputScope}>
      {children}
    </InputProvider>
  );
};

InputRoot.displayName = INPUT_NAME;

export { InputRoot, InputRoot as Root, createInputScope, useInputContext, INPUT_NAME };

export type { Valence, InputRootProps, InputScopedProps };
