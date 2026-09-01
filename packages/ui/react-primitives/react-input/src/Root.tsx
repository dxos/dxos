//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useId } from '@dxos/react-hooks';

import { INPUT_NAME, InputProvider, type InputRootProps, type InputScopedProps, type Valence } from './InputContext.ts';

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

export { InputRoot };

export type { InputRootProps, InputScopedProps, Valence };
