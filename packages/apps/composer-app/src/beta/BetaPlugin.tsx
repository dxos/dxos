//
// Copyright 2024 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

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

// TODO(burdon): Replace with formatted markdown?
//  https://www.npmjs.com/package/react-markdown (ESM only).
//  https://www.npmjs.com/package/simple-markdown
// const notice = [
//   //
//   'Composer is now in Beta and updates will now be published to the new site [https://composer.space](https://composer.space).',
//   'Composer will remain free to use and we are still 100% committed to building privacy-preserving open source software.',
//   "However, we're asking Beta users to sign-up to help us build Composer during this next stage of development.",
//   // TODO(burdon): Why.
//   // TODO(burdon): How.
//   // TODO(burdon): Next steps.
//   // TODO(burdon): Discord or Email us.
// ];

const SimpleLink = ({ children, href, target }: PropsWithChildren<{ href: string; target?: string }>) => (
  <Link variant='neutral' href={href} target={target ?? '_blank'}>
    {children}
  </Link>
);

const BetaDialog = () => {
  const SIGNUP_URL = 'https://dxos.org/composer#beta';
  const handleSignup = () => {
    window.open(SIGNUP_URL, '_blank');
  };

  // TODO(burdon): Magic link Auto enable existing users without signing up?
  return (
    <Dialog.Content classNames='md:max-is-[30rem]'>
      <Dialog.Title>Composer Beta Notice</Dialog.Title>
      <p className='plb-2'>
        <span className='font-bold'>Composer is now in Beta</span> and updates to Composer will now be published to the
        new site
        <SimpleLink href='https://composer.space'>https://composer.space</SimpleLink>.
      </p>
      <p className='plb-2'>
        Composer will remain free to use and open source and we&apos;re still 100% committed to building preserving
        applications. However, we&apos;re asking Beta users to sign-up during this next stage of development.
      </p>
      <p className='plb-2'>Why we are doing this.</p>
      <ol className='plb-2'>
        <li>1. We&apos;re looking to get more detailed feedback from early users.</li>
        <li>2. We want to communicate (opt-in) with users via email about updates and progress.</li>
      </ol>
      <p className='plb-2'>
        Please
        <SimpleLink href='https://dxos.org/composer'>click here</SimpleLink> to sign-up for the beta.
      </p>
      <p className='plb-2'>
        To transfer your data, you will be able to transfer your existing data by initiating a
        <SimpleLink href='https://docs.dxos.org/guide/platform/halo.html#device-invitations'>
          device invitation
        </SimpleLink>{' '}
        from your existing account on composer.dxos.org to move all your data over to{' '}
        <SimpleLink href='https://composer.space'>composer.space</SimpleLink>.
      </p>
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
