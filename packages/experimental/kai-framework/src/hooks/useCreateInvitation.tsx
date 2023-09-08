//
// Copyright 2023 DXOS.org
//

import clipboardCopy from 'clipboard-copy';
import { useEffect, useState } from 'react';

import { log } from '@dxos/log';
import { PublicKey, ShellLayout } from '@dxos/react-client';
import { Space } from '@dxos/react-client/echo';
import { CancellableInvitationObservable, Invitation } from '@dxos/react-client/invitations';
import { useShell } from '@dxos/react-shell';

import { createInvitationPath } from './useAppRouter';

export const useCreateInvitation = () => {
  const shell = useShell();
  const [observable, setObservable] = useState<CancellableInvitationObservable>();
  useEffect(() => {
    return () => {
      void observable?.cancel();
    };
  }, []);

  useEffect(() => {
    if (observable) {
      const href = createInvitationPath(observable.get());
      const url = new URL(href, window.origin);
      console.log(url); // Log for test automation.
      void clipboardCopy(url.toString());
    }
  }, [observable]);

  return (space: Space, direct?: boolean) => {
    if (direct) {
      const swarmKey = PublicKey.random(); // TODO(burdon): Factor out.
      const observable = space.share({
        swarmKey,
        type: Invitation.Type.MULTIUSE,
        authMethod: Invitation.AuthMethod.NONE,
      });

      const subscription = observable.subscribe(
        (invitation: Invitation) => {
          if (invitation.state === Invitation.State.CONNECTING) {
            setObservable(observable);
            subscription.unsubscribe();
          }
        },
        (error: any) => {
          log.error(error);
          subscription.unsubscribe();
        },
      );
    } else {
      void shell.setLayout(ShellLayout.SPACE, { spaceKey: space.key });
    }
  };
};
