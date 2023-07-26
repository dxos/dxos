//
// Copyright 2023 DXOS.org
//

import { cloneElement } from 'react';
import { Event, SingleOrArray } from 'xstate';

import type { Identity } from '@dxos/react-client/halo';

import { IdentityEvent } from './identityMachine';

export type IdentityPanelHeadingProps = {
  titleId: string;
  identity: Identity;
};

export type IdentityPanelImplProps = IdentityPanelHeadingProps & {
  activeView: string;
  send: (event: SingleOrArray<Event<IdentityEvent>>) => void;
  createInvitationUrl: (invitationCode: string) => string;
};

export type IdentityPanelProps = Partial<
  Pick<IdentityPanelImplProps, 'titleId' | 'createInvitationUrl'> & { onDone?: () => void }
>;

export type IdentityPanelStepProps = Pick<IdentityPanelImplProps, 'send'> & {
  active?: boolean;
  onDone?: () => void;
  doneActionParent?: Parameters<typeof cloneElement>[0];
};
