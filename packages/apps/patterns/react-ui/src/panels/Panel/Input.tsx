//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Input as BaseInput, InputProps as BaseInputProps, mx } from '@dxos/react-components';

export type InputProps = {} & BaseInputProps;

export const Input = (props: InputProps) => {
  const { slots, ...restProps } = props;
  const { root, input, ...restSlots } = { ...slots };
  return (
    <BaseInput
      {...restProps}
      slots={{
        ...restSlots,
        root: { ...root, className: mx('m-0', root?.className) },
        input: { ...input, className: mx('p-4 dark:bg-neutral-700 dark:hover:bg-neutral-650', input?.className) }
      }}
    ></BaseInput>
  );
};
