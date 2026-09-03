//
// Copyright 2026 DXOS.org
//

import './ui.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useRef } from 'react';

import { type RecoveryAction, type RecoveryUi, createRecoveryUi } from './ui';

type RecoveryUiStoryArgs = {
  /** Lines printed on mount, standing in for the page's boot banner. */
  lines?: string[];
  busy?: boolean;
  debugPortActive?: boolean;
};

/**
 * Mounts the framework-free recovery chrome so its layout and states are reviewable without
 * booting the real page (which touches OPFS and can wipe the origin).
 */
const RecoveryUiStory = ({ lines = [], busy = false, debugPortActive = false }: RecoveryUiStoryArgs) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const uiRef = useRef<RecoveryUi>(undefined);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }
    const ui = createRecoveryUi({ container: containerRef.current });
    uiRef.current = ui;
    ui.onAction((action: RecoveryAction) => ui.print(`[story] ${action}`));
    lines.forEach((line) => ui.print(line));
    ui.setDebugPortActive(debugPortActive);
    ui.setBusy(busy);
  }, [lines, busy, debugPortActive]);

  return <div ref={containerRef} />;
};

const BANNER = [
  'Composer recovery mode',
  'Origin: https://labs.composer.space',
  '',
  'You are in safe mode — no client, plugins, sync, or indexing until you choose an action.',
  '',
  'Debug port server: http://127.0.0.1:9321',
];

const meta = {
  title: 'apps/composer-app/Recovery',
  component: RecoveryUiStory,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof RecoveryUiStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { lines: BANNER },
};

export const Busy: Story = {
  args: { lines: [...BANNER, '', 'Exporting profile archive (.dxprofile with SQLite entry)…'], busy: true },
};

export const DebugPortRunning: Story = {
  args: {
    lines: [
      ...BANNER,
      '',
      'Session: 951c7576-b636-47ff-acc6-a1c4fdf65fb6',
      'Connecting to http://127.0.0.1:9321…',
      'Waiting for debug server…',
    ],
    busy: true,
    debugPortActive: true,
  },
};
