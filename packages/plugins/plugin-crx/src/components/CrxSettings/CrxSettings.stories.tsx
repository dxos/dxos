//
// Copyright 2026 DXOS.org
//

import { type Decorator, type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations';
import { Settings } from '../../types';
import { PING_ACK_EVENT, PING_EVENT, RENDER_READY_DATASET_KEY } from '../../util';
import { CrxSettings } from './CrxSettings';

/**
 * Stand in for the extension's content relay so the connection test succeeds: set the readiness
 * dataset marker and ack each ping with a fake identity. Without this the test button always
 * reports "Extension not detected" — storybook is not a Composer origin with the extension relay.
 */
const withFakeExtension: Decorator = (Story) => {
  useEffect(() => {
    document.documentElement.dataset[RENDER_READY_DATASET_KEY] = '1';
    const listener = (event: Event) => {
      const detail = (event as CustomEvent).detail as { id: string };
      window.dispatchEvent(
        new CustomEvent(PING_ACK_EVENT, {
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
    window.addEventListener(PING_EVENT, listener);
    return () => {
      delete document.documentElement.dataset[RENDER_READY_DATASET_KEY];
      window.removeEventListener(PING_EVENT, listener);
    };
  }, []);
  return <Story />;
};

const DefaultStory = (props: { initial?: Settings.Settings; readonly?: boolean }) => {
  const [settings, setSettings] = useState<Settings.Settings>(props.initial ?? Settings.defaults);
  return (
    <CrxSettings
      settings={settings}
      onSettingsChange={props.readonly ? undefined : (update) => setSettings((prev) => update(prev))}
    />
  );
};

const meta: Meta<typeof DefaultStory> = {
  title: 'plugins/plugin-crx/CrxSettings',
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
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
