//
// Copyright 2023 DXOS.org
//
import * as AlertPrimitive from '@radix-ui/react-alert-dialog';
import React from 'react';

import { ThemeContext, useId } from '@dxos/react-components';

import { JoinSpaceHeading } from './JoinSpaceHeading';

export interface JoinPanelProps {
  // spaceKey: PublicKey;
  displayName: string;
}

export const JoinPanel = ({
  // spaceKey,
  displayName
}: JoinPanelProps) => {
  // const space = useSpace(spaceKey);
  const titleId = useId('joinTitle');
  return (
    <AlertPrimitive.Root defaultOpen>
      <ThemeContext.Provider value={{ themeVariant: 'os' }}>
        <AlertPrimitive.Overlay />
        <AlertPrimitive.Content aria-labelledby={titleId}>
          <JoinSpaceHeading
            titleId={titleId}
            displayName={
              // eslint-disable-next-line no-irregular-whitespace
              // space?.key.truncate() ?? ' '
              displayName
            }
            onClickExit={() => {}}
          />
        </AlertPrimitive.Content>
      </ThemeContext.Provider>
    </AlertPrimitive.Root>
  );
};
