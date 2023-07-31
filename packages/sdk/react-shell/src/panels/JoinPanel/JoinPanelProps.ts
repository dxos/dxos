//
// Copyright 2023 DXOS.org
//

import { cloneElement, ComponentProps } from 'react';
import { Event, SingleOrArray } from 'xstate';

import type { Identity } from '@dxos/react-client/halo';
import type { Invitation } from '@dxos/react-client/invitations';
import { type AuthenticatingInvitationObservable, InvitationResult } from '@dxos/react-client/invitations';

import { JoinEvent } from './joinMachine';

export type JoinPanelMode = 'default' | 'halo-only';

export interface JoinPanelProps {
  mode?: JoinPanelMode;
  initialInvitationCode?: string;
  titleId?: string;
  exitActionParent?: Parameters<typeof cloneElement>[0];
  onExit?: () => void;
  doneActionParent?: Parameters<typeof cloneElement>[0];
  onDone?: (result: InvitationResult | null) => void;
  parseInvitationCodeInput?: (invitationCodeInput: string) => string;
}

export type JoinPanelImplProps = Pick<
  JoinPanelProps,
  'mode' | 'onExit' | 'onDone' | 'exitActionParent' | 'doneActionParent'
> &
  Pick<JoinStepProps, 'send'> & {
    titleId: string;
    activeView: string;
    failed: Set<'Halo' | 'Space'>;
    pending: boolean;
    unredeemedCodes?: Partial<{
      Halo: string;
      Space: string;
    }>;
    invitationStates?: Partial<{
      Halo: Invitation.State;
      Space: Invitation.State;
    }>;
    onHaloDone?: () => void;
    onSpaceDone?: () => void;
    onHaloInvitationCancel?: () => Promise<void> | undefined;
    onSpaceInvitationCancel?: () => Promise<void> | undefined;
    onHaloInvitationAuthenticate?: (authCode: string) => Promise<void> | undefined;
    onSpaceInvitationAuthenticate?: (authCode: string) => Promise<void> | undefined;
  };

export interface IdentityAction {
  type: 'select identity' | 'added identity';
  identity: Identity;
}

export interface EmptyJoinAction {
  type: 'deselect identity' | 'cancel addition' | 'add identity';
}

export interface EmptyInvitationAction {
  type:
    | 'authenticating invitation'
    | 'authenticate invitation'
    | 'cancel invitation'
    | 'cancelled invitation'
    | 'connect invitation'
    | 'fail invitation'
    | 'accepted invitation'
    | 'timeout invitation'
    | 'reset invitation';
  from: 'space' | 'halo';
}

export interface InvitationCodeAction {
  type: 'connecting invitation';
  from: 'space' | 'halo';
  invitation: AuthenticatingInvitationObservable;
}

export type InvitationAction = EmptyInvitationAction | InvitationCodeAction;

export interface AdditionMethodAction {
  type: 'select addition method';
  method: 'recover identity' | 'accept device invitation' | 'create identity';
}

export type JoinAction = IdentityAction | EmptyJoinAction | AdditionMethodAction | InvitationAction;

export type InvitationView =
  | 'invitation input'
  | 'invitation rescuer'
  | 'invitation authenticator'
  | 'invitation accepted';

export type JoinView =
  | 'identity selector'
  | 'addition method chooser'
  | 'identity input'
  | 'identity added'
  | 'space invitation acceptor'
  | 'halo invitation acceptor';

export interface JoinStepProps extends ComponentProps<'div'> {
  send: (event: SingleOrArray<Event<JoinEvent>>) => void;
  active?: boolean;
}

export interface JoinStateContext {
  activeView: JoinView;
  unredeemedSpaceInvitationCode?: string;
  spaceInvitation?: AuthenticatingInvitationObservable;
  spaceViewState: InvitationView;
  spaceInvitationAnnotation?: 'authenticating' | 'authentication failed';
  unredeemedHaloInvitationCode?: string;
  haloInvitation?: AuthenticatingInvitationObservable;
  haloViewState: InvitationView;
  haloInvitationAnnotation?: 'authenticating' | 'authentication failed';
  selectedIdentity?: Identity;
  additionMethod?: AdditionMethodAction['method'];
}
