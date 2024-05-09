//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { parseClientPlugin } from '@braneframe/plugin-client';
import {
  LayoutAction,
  type SurfaceProvides,
  parseIntentPlugin,
  resolvePlugin,
  type PluginDefinition,
} from '@dxos/app-framework';
import { Button, Dialog, Link } from '@dxos/react-ui';

export const meta = {
  id: 'dxos.org/plugin/beta',
};

const DEPRECATED_DEPLOYMENT = window.location.origin === 'https://composer.dxos.org';
const BETA_DEPLOYMENT = window.location.origin === 'https://composer.space';

const BetaPlugin = (): PluginDefinition<SurfaceProvides> => {
  return {
    meta,
    ready: async (plugins) => {
      if (DEPRECATED_DEPLOYMENT) {
        const dispatch = resolvePlugin(plugins, parseIntentPlugin)?.provides.intent.dispatch;
        await dispatch?.({
          action: LayoutAction.SET_LAYOUT,
          data: {
            element: 'dialog',
            state: true,
            component: `${meta.id}/BetaDialog`,
          },
        });

        return;
      }

      const firstRun = resolvePlugin(plugins, parseClientPlugin)?.provides.firstRun;
      const identityKey = resolvePlugin(plugins, parseClientPlugin)
        ?.provides.client.halo.identity.get()
        ?.identityKey.toHex();

      // TODO(burdon): Need way to trigger this from shell panel?
      if (firstRun && identityKey && BETA_DEPLOYMENT) {
        void fetch('/connect', {
          method: 'POST',
          headers: new Headers({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ identity_key: identityKey }),
        });
      }
    },
    provides: {
      surface: {
        component: ({ data, role }) => {
          if (role === 'dialog' && data.component === `${meta.id}/BetaDialog`) {
            return <BetaDialog />;
          }

          return null;
        },
      },
    },
  };
};

const BetaDialog = () => {
  const handleSignup = () => {
    window.open('https://dxos.org/composer#beta', '_blank');
  };

  return (
    <Dialog.Content classNames='md:max-is-[30rem]'>
      <Dialog.Title>Composer Beta Notice</Dialog.Title>
      <p className='plb-2'>
        <span className='font-bold'>Composer is entering closed beta!</span> What does that mean?
      </p>
      <p className='plb-2'>
        composer.dxos.org is going to stop being updated, however will remain available for your continued usage for the
        forseeable future. (It&apos;s also{' '}
        <Link variant='neutral' href='https://github.com/dxos/dxos' target='_blank'>
          open source
        </Link>
        , and will remain so.)
      </p>
      <p className='plb-2'>
        Going forward Composer updates will be found at{' '}
        <Link variant='neutral' href='https://composer.space' target='_blank'>
          composer.space
        </Link>
        , which will be behind a beta gate that requires an email and approval to access. If you&apos;re an existing
        Composer user we&apos;ll get you into the beta ASAP, just{' '}
        <Link variant='neutral' href='https://dxos.org/composer' target='_blank'>
          click here
        </Link>{' '}
        to signup. Once you&apos;ve been invited to the beta, do a{' '}
        <Link
          variant='neutral'
          href='https://docs.dxos.org/guide/platform/halo.html#device-invitations'
          target='_blank'
        >
          device invitation
        </Link>{' '}
        from your existing account on composer.dxos.org to move all your data over to{' '}
        <Link variant='neutral' href='https://composer.space' target='_blank'>
          composer.space
        </Link>
        .
      </p>
      <p className='plb-2'>Why are we doing this?</p>
      <ol className='plb-2'>
        <li>
          1. We&apos;re looking to elicit more feedback from early users of Composer in order to shape the product into
          something useful.
        </li>
        <li>
          2. We want to communicate with Composer users via email about updates and progress – not everyone is on
          Discord, nor do they want to be!
        </li>
      </ol>
      <div role='none' className='flex justify-end gap-2'>
        <Dialog.Close asChild>
          <Button>Dismiss</Button>
        </Dialog.Close>
        <Button variant='primary' onClick={handleSignup}>
          Sign up
        </Button>
      </div>
    </Dialog.Content>
  );
};

export default BetaPlugin;
