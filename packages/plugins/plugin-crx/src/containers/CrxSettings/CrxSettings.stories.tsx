//
// Copyright 2026 DXOS.org
//

import { type Decorator, type Meta, type StoryObj } from '@storybook/react-vite';
import * as Atom from 'effect/unstable/reactivity/Atom';
import React, { useEffect, useMemo } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Proxy } from '@dxos/crx-protocol';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { meta as pluginMeta } from '#meta';
import { translations } from '#translations';
import { Settings } from '#types';

import { CrxSettings } from './CrxSettings';

/**
 * Stand in for the extension's content relay so the connection test succeeds: set the readiness
 * dataset marker and ack each ping with a fake identity. Without this the test button always
 * reports "Extension not detected" — storybook is not a Composer origin with the extension relay.
 */
const withFakeExtension: Decorator = (Story) => {
  useEffect(() => {
    document.documentElement.dataset[Proxy.RENDER_READY_DATASET_KEY] = '1';
    const listener = (event: Event) => {
      const detail = (event as CustomEvent).detail as { id: string };
      window.dispatchEvent(
        new CustomEvent(Proxy.PING_ACK_EVENT, {
          detail: {
            version: 1,
            id: detail.id,
            ok: true,
            extensionVersion: '0.0.0-story',
            extensionName: 'Fake',
          },
        }),
      );
    };
    window.addEventListener(Proxy.PING_EVENT, listener);
    return () => {
      delete document.documentElement.dataset[Proxy.RENDER_READY_DATASET_KEY];
      window.removeEventListener(Proxy.PING_EVENT, listener);
    };
  }, []);
  return <Story />;
};

// The container reads and writes the contributed settings entry, so the story owns one per render.
const DefaultStory = ({ initial, readonly }: { initial?: Settings.Settings; readonly?: boolean }) => {
  const subject = useMemo(
    () => ({
      prefix: pluginMeta.profile.key,
      schema: Settings.Settings,
      atom: Atom.make<Settings.Settings>(initial ?? Settings.defaults).pipe(Atom.keepAlive),
    }),
    [initial],
  );

  return <CrxSettings subject={subject} readonly={readonly} />;
};

const meta: Meta<typeof DefaultStory> = {
  title: 'plugins/plugin-crx/containers/CrxSettings',
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' }), withPluginManager()],
  parameters: {
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: [withFakeExtension],
};

export const Readonly: Story = {
  decorators: [withFakeExtension],
  args: {
    readonly: true,
  },
};

/**
 * No fake relay — the connection test talks to the real composer-crx extension. For development:
 * load the dev extension (`moon run composer-crx:build`, load unpacked from `out/composer-crx`),
 * then add this storybook's origin (e.g. `http://localhost:9009/*`) to the extension's Composer
 * URLs in its options page so the content relay installs here.
 *
 * NOTE: The extension's content script runs only in the top frame,
 * so the story must be opened OUTSIDE the storybook manager's preview iframe:
 * `http://localhost:9009/iframe.html?id=plugins-plugin-crx-crxsettings--live`.
 * Without that setup the test reports "Extension not detected".
 */
export const Live: Story = {};
