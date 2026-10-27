//
// Copyright 2023 DXOS.org
//

import React, { type ForwardedRef, cloneElement, forwardRef } from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Dialog from '@dxos/react-ui/Dialog';
import * as Hooks from '@dxos/react-ui/Hooks';

import { translationKey } from '../../translations.ts';
import { type JoinPanelMode } from './JoinPanelProps.ts';

export type JoinSpaceHeadingProps = {
  mode?: JoinPanelMode;
  titleId: string;
  exitActionParent?: Parameters<typeof cloneElement>[0];
  onExit?: () => void;
};

/** The panel's Dialog.Header: its title, and an exit button unless joining is the only way on (`halo-only`). */
export const JoinHeading = forwardRef(
  ({ mode, titleId, exitActionParent, onExit }: JoinSpaceHeadingProps, forwardedRef: ForwardedRef<HTMLDivElement>) => {
    const { t } = Hooks.useTranslation(translationKey);

    const exitButton = (
      <Button.Root
        variant='ghost'
        icon='ph--x--regular'
        iconOnly
        label={t('exit.label')}
        {...(onExit && { onClick: onExit })}
        data-testid='join-exit'
      />
    );

    return (
      <Dialog.Header ref={forwardedRef}>
        <Dialog.Title id={titleId}>
          {t(mode === 'halo-only' ? 'selecting-identity.heading' : 'joining-space.heading')}
        </Dialog.Title>
        {mode !== 'halo-only' && (exitActionParent ? cloneElement(exitActionParent, {}, exitButton) : exitButton)}
      </Dialog.Header>
    );
  },
);
