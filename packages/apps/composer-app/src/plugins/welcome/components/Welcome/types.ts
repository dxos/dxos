//
// Copyright 2024 DXOS.org
//

import type { Identity } from '@dxos/client/halo';

export enum WelcomeState {
  INIT = 0,
  EMAIL_SENT = 1,
}

export type WelcomeScreenProps = {
  state: WelcomeState;
  identity?: Identity | null;
  error?: boolean;
  onSignup?: (email: string) => void;
  onJoinIdentity?: () => void;
  onSpaceInvitation?: () => void;
};

export const validEmail = (email: string) => !!email.match(/.+@.+\..+/);
