//
// Copyright 2024 DXOS.org
//

import type { Identity } from '@dxos/client/halo';
import { type MaybePromise } from '@dxos/util';

export enum WelcomeState {
  INIT = 0,
  EMAIL_SENT = 1,
}

export type WelcomeScreenProps = {
  state: WelcomeState;
  identity?: Identity | null;
  error?: boolean;
  onSignup?: (email: string) => MaybePromise<void>;
  onPasskey?: () => MaybePromise<void>;
  onJoinIdentity?: () => MaybePromise<void>;
  onRecoverIdentity?: () => MaybePromise<void>;
  onSpaceInvitation?: () => MaybePromise<void>;
};

export const validEmail = (email: string) => !!email.match(/.+@.+\..+/);
