//
// Copyright 2023 DXOS.org
//

import { Question } from '@phosphor-icons/react';
import React from 'react';

import { Button, ButtonProps, mx, getSize } from '@dxos/react-components';

export type HelpButtonProps = ButtonProps & {
  screenReaderLabel?: string;
};

export const HelpButton = (props: HelpButtonProps) => {
  const { className, screenReaderLabel, ...restProps } = props;
  return (
    <Button variant='ghost' className={mx('plb-3 pli-3 absolute z-[1]', className)} {...restProps}>
      <Question weight='bold' className={getSize(4)} />
      {screenReaderLabel && <span className='sr-only'>{screenReaderLabel}</span>}
    </Button>
  );
};
