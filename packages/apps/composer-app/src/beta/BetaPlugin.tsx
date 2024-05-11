//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { parseClientPlugin } from '@braneframe/plugin-client';
import {
  LayoutAction,
  type SurfaceProvides,
  parseIntentPlugin,
  resolvePlugin,
  type PluginDefinition,
} from '@dxos/app-framework';
import { Button, Dialog } from '@dxos/react-ui';

// @ts-ignore
import NOTICE from './notice.md?raw';

export const meta = {
  id: 'dxos.org/plugin/beta',
};

const url = new URL(window.location.href);
// const LOCALHOST = url.hostname === 'localhost';
const DEPRECATED_DEPLOYMENT = url.hostname === 'composer.dxos.org';
const BETA_DEPLOYMENT = url.hostname === 'composer.space';

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

// TODO(burdon): Reconcile with react-theme.
const linkStyle = 'text-sky-700 dark:text-sky-200 hover:opacity-80';

function link(this: any, d: any) {
  if (d.type !== 'textDirective') {
    return false;
  }

  this.tag('<a');
  if (d.attributes && 'href' in d.attributes) {
    this.tag(` class="${linkStyle}" target="_blank" rel="noreferrer" href="${this.encode(d.attributes.href)}"`);
  }
  this.tag('>');
  this.raw(d.label || '');
  this.tag('</a>');
}

const BetaDialog = () => {
  // TODO(burdon): Magic link Auto enable existing users without signing up?
  const SIGNUP_URL = 'https://dxos.org/composer#beta';
  const handleSignup = () => {
    window.open(SIGNUP_URL, '_blank');
  };

  const [html, setHtml] = useState<string>();
  useEffect(() => {
    setTimeout(async () => {
      // https://github.com/micromark/micromark (ESM).
      const { micromark } = await import('micromark');
      // https://github.com/micromark/micromark-extension-directive
      const { directive, directiveHtml } = await import('micromark-extension-directive');
      setHtml(micromark(NOTICE, { extensions: [directive()], htmlExtensions: [directiveHtml({ link })] }));
    });
  }, []);

  if (!html) {
    return null;
  }

  return (
    <Dialog.Content classNames='md:max-is-[30rem]'>
      <Dialog.Title>Composer Beta Notice</Dialog.Title>
      <div role='none' className='plb-2 space-y-3' dangerouslySetInnerHTML={{ __html: html }} />
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
