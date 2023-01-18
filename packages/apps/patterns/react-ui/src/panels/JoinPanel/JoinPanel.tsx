//
// Copyright 2023 DXOS.org
//
import * as AlertPrimitive from '@radix-ui/react-alert-dialog';
import React from 'react';

import { ThemeContext, useId } from '@dxos/react-components';

import { JoinSpaceHeading, JoinSpaceHeadingProps } from './JoinSpaceHeading';

export type JoinPanelProps = Pick<JoinSpaceHeadingProps, 'spaceTitle'>;

export const JoinPanel = ({ spaceTitle }: JoinPanelProps) => {
  const titleId = useId('joinTitle');
  return (
    <AlertPrimitive.Root defaultOpen>
      <ThemeContext.Provider value={{ themeVariant: 'os' }}>
        <AlertPrimitive.Overlay className='fixed inset-0 backdrop-blur z-50' />
        <AlertPrimitive.Content
          aria-labelledby={titleId}
          className='fixed inset-0 z-[51] flex flex-col items-center justify-center p-2 md:p-4 lg:p-8'
        >
          <div role='none' className='is-full max-is-[480px]'>
            <JoinSpaceHeading titleId={titleId} spaceTitle={spaceTitle} onClickExit={() => {}} />
          </div>
        </AlertPrimitive.Content>
      </ThemeContext.Provider>
    </AlertPrimitive.Root>
  );
};
