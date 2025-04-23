//
// Copyright 2024 DXOS.org
//

import type { Identity } from '@dxos/client/halo';
import { type MaybePromise } from '@dxos/util';

export enum WelcomeState {
  INIT = 0,
  // TODO(wittjosiah): Remove this state once signups are auto-admitted.
  EMAIL_SENT = 1,
  LOGIN_SENT = 2,
  SPACE_INVITATION = 3,
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
  onGoToLogin?: () => MaybePromise<void>;
};

export const validEmail = (email: string) => !!email.match(/.+@.+\..+/);
