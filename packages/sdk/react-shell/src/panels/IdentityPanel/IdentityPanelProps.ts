//
// Copyright 2023 DXOS.org
//

import { cloneElement } from 'react';
import { Event, SingleOrArray } from 'xstate';

import type { Identity } from '@dxos/react-client/halo';

import { IdentityEvent } from './identityMachine';

export type IdentityPanelImplProps = {
  titleId: string;
  activeView: string;
  send: (event: SingleOrArray<Event<IdentityEvent>>) => void;
  createInvitationUrl: (invitationCode: string) => string;
  identity: Identity;
  onDone?: () => void;
  doneActionParent?: Parameters<typeof cloneElement>[0];
  invitationUrl?: string;
  authCode?: string;
};

export type IdentityPanelProps = Partial<Omit<IdentityPanelImplProps, 'send' | 'activeView' | 'identity'>>;

export type IdentityPanelHeadingProps = Pick<IdentityPanelImplProps, 'titleId' | 'identity'> & { title: string };

export type IdentityPanelStepProps = Pick<IdentityPanelImplProps, 'send' | 'onDone' | 'doneActionParent'> & {
  active?: boolean;
};
