//
// Copyright 2023 DXOS.org
//

import { type Scope, createContextScope } from '@radix-ui/react-context';
import React, { type PropsWithChildren } from 'react';

import { useId } from '@dxos/react-hooks';

const INPUT_NAME = 'Input';

type Valence = 'success' | 'info' | 'warning' | 'error' | 'neutral';

type InputScopedProps<P> = P & { __inputScope?: Scope };

type InputRootProps = PropsWithChildren<{
  id?: string;
  validationValence?: Valence;
  descriptionId?: string;
  errorMessageId?: string;
}>;

const [createInputContext, createInputScope] = createContextScope(INPUT_NAME, []);

type InputContextValue = {
  id: string;
  descriptionId: string;
  errorMessageId: string;
  validationValence: Valence;
};

const [InputProvider, useInputContext] = createInputContext<InputContextValue>(INPUT_NAME);

const InputRoot = ({
  __inputScope,
  id: propsId,
  descriptionId: propsDescriptionId,
  errorMessageId: propsErrorMessageId,
  validationValence = 'neutral',
  children,
}: InputScopedProps<InputRootProps>) => {
  const id = useId('input', propsId);
  const descriptionId = useId('input__description', propsDescriptionId);
  const errorMessageId = useId('input__error-message', propsErrorMessageId);
  return (
    <InputProvider {...{ id, descriptionId, errorMessageId, validationValence }} scope={__inputScope}>
      {children}
    </InputProvider>
  );
};

InputRoot.displayName = INPUT_NAME;

export { InputRoot, createInputScope, useInputContext, INPUT_NAME };

export type { Valence, InputRootProps, InputScopedProps };
