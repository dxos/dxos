//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useId } from '@dxos/react-hooks';

import { INPUT_NAME, InputProvider, type InputRootProps, type Valence } from './InputContext';

const InputRoot = ({
  id: propsId,
  descriptionId: propsDescriptionId,
  errorMessageId: propsErrorMessageId,
  validationValence = 'neutral',
  children,
}: InputRootProps) => {
  const id = useId('input', propsId);
  const descriptionId = useId('input__description', propsDescriptionId);
  const errorMessageId = useId('input__error-message', propsErrorMessageId);
  return <InputProvider {...{ id, descriptionId, errorMessageId, validationValence }}>{children}</InputProvider>;
};

InputRoot.displayName = INPUT_NAME;

export { InputRoot };

export type { InputRootProps, Valence };
