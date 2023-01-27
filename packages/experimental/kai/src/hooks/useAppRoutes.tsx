//
// Copyright 2022 DXOS.org
//

import React, { useEffect, useRef } from 'react';
import { Outlet, useNavigate, useParams, useRoutes, useSearchParams } from 'react-router-dom';

import { CancellableInvitationObservable, Invitation, InvitationEncoder, Space } from '@dxos/client';
import { PublicKey } from '@dxos/keys';
import { RequireIdentity } from '@dxos/react-appkit';
import base from 'base-x';

import {
  CreateIdentityPage,
  IdentityPage,
  InitPage,
  JoinIdentityPage,
  JoinSpacePage,
  RecoverIdentityPage,
  SettingsPage,
  SpacePage
} from '../pages';
import { useClient, useSpaces } from '@dxos/react-client';
import { AuthMethod } from '@dxos/protocols/proto/dxos/halo/invitations';
import { randomBytes } from '@dxos/crypto';

export const createSpacePath = (spaceKey: PublicKey, frame?: string) =>
  `/${spaceKey.truncate()}` + (frame ? `/${frame}` : '');

export const createInvitationPath = (invitation: Invitation) =>
  `/space/join?invitation=${InvitationEncoder.encode(invitation)}`;

/**
 * Main app routes.
 */
export const useAppRoutes = () =>
  useRoutes([
    {
      path: '/',
      element: <InitPage />
    },
    {
      path: '/identity/create',
      element: <CreateIdentityPage />
    },
    {
      path: '/identity/recover',
      element: <RecoverIdentityPage />
    },
    {
      path: '/identity/join',
      element: <JoinIdentityPage />
    },
    {
      path: '/',
      element: <RequireIdentity redirect='/' />,
      children: [
        // TODO(wittjosiah): Factor out appbar to a layout.
        {
          path: '/identity',
          element: <IdentityPage />
        },
        {
          path: '/settings',
          element: <SettingsPage />
        },
        {
          path: '/space/join',
          element: <JoinSpacePage />
        },
        {
          path: '/:spaceKey',
          element: <KaiTestInviter />,
          children: [
            {
              path: '/:spaceKey',
              element: <SpacePage />,
              children: [
                {
                  path: '/:spaceKey/:frame',
                  element: <SpacePage />
                }
              ]
            }
          ]
        }
      ]
    }
  ]);

export const KaiTestInviter = () => {
  const { spaceKey: currentSpaceKey } = useParams();
  const [params, setParams] = useSearchParams()
  const shareKey = params.get('shareKey')
  const client = useClient();
  const invitation = useRef<CancellableInvitationObservable>()

  const spaces = useSpaces();
  const space = currentSpaceKey ? matchSpaceKey(spaces, currentSpaceKey) : undefined;

  useEffect(() => {
    if(space) { // Host
      setTimeout(async () => {
        try {
          if(shareKey) {
            const existingSwarmKey = PublicKey.from(base62.decode(shareKey))
            invitation.current = await space.invitations.find(invitation => invitation.invitation?.swarmKey?.equals(existingSwarmKey))
          }
        } catch {}

        if(!invitation.current) {
          const swarmKey = PublicKey.random();

          console.log('creating invitation', swarmKey.toHex())
  
          invitation.current = await space.createInvitation({
            authMethod: AuthMethod.NONE,
            type: Invitation.Type.MULTIUSE_TESTING,
            swarmKey,
          })
          invitation.current.subscribe({
            onError(err) {
              console.error(err)
            },
            onSuccess(invitation) {
              console.log('success', invitation)
            },
            onConnecting(invitation) {
              console.log('connecting', invitation)
            },
            onConnected(invitation) {
              console.log('connected', invitation)
            },
          })

          console.log('invitation created', invitation.current)
          setParams(prev => {
            prev.set('shareKey', base62.encode(swarmKey.asBuffer()))
            return prev;
          })
        }
      })
    } else if(shareKey && !space) { // Guest
      setTimeout(async () => {
        const swarmKey = PublicKey.from(base62.decode(shareKey))
        console.log('joining invitation', swarmKey.toHex())

        invitation.current = await client.echo.acceptInvitation({
          invitationId: PublicKey.random().toHex(), // TODO(dmaretskyi): Does this need to match the guest? Auto-generate?
          swarmKey,
        })
        invitation.current.subscribe({
          onError(err) {
            console.error(err)
          },
          onSuccess(invitation) {
            console.log('joined', invitation)
          },
        })
      })
    }
  }, [shareKey, space])


  if(!shareKey || space) {
    return <Outlet/>
  }

  return null
}

const matchSpaceKey = (spaces: Space[], spaceKey: string): Space | undefined =>
  spaces.find((space) => space.key.truncate() === spaceKey);

const base62 = base('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
