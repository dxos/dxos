//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';
import { type CodeCapabilities } from '#types';

import { BuildOutput } from './BuildOutput';

type ProjectBuildState = CodeCapabilities.ProjectBuildState;

const stamp = Date.now();

const CLEAN_BUILD: ProjectBuildState = {
  lastBuild: {
    ok: true,
    diagnostics: [],
    entry: {
      path: 'src/hello.ts',
      source: "console.log('Hello, World!');",
    },
    timestamp: stamp,
  },
};

const CLEAN_RUN: ProjectBuildState = {
  ...CLEAN_BUILD,
  lastRun: {
    ok: true,
    stdout: ['Hello, World!', 'Generated at 2026-05-21T17:00:00.000Z'],
    stderr: [],
    diagnostics: [],
    timestamp: stamp,
  },
};

const BUILD_ERRORS: ProjectBuildState = {
  lastBuild: {
    ok: false,
    diagnostics: [
      {
        severity: 'error',
        path: 'src/hello.ts',
        line: 7,
        column: 22,
        code: 2322,
        message: "Type 'number' is not assignable to type 'string'.",
      },
      {
        severity: 'warning',
        path: 'src/util.ts',
        line: 12,
        column: 5,
        code: 6133,
        message: "'unusedVar' is declared but its value is never read.",
      },
    ],
    entry: undefined,
    timestamp: stamp,
  },
};

const RUNTIME_ERROR: ProjectBuildState = {
  ...CLEAN_BUILD,
  lastRun: {
    ok: false,
    stdout: ['starting…'],
    stderr: ['Error: boom: deliberate runtime error\n    at main (eval at <anonymous>:3:9)'],
    diagnostics: [],
    timestamp: stamp,
  },
};

const BUSY_BUILD: ProjectBuildState = {
  busy: 'build',
};

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div className='w-[40rem] h-[24rem] border border-separator overflow-hidden'>{children}</div>
);

const meta = {
  title: 'plugins/plugin-code/components/BuildOutput',
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: { layout: 'fullscreen', translations },
} satisfies Meta;

export default meta;

type Story = StoryObj;

/** No prior build — empty-state placeholder. */
export const Empty: Story = {
  render: () => (
    <Frame>
      <BuildOutput state={undefined} />
    </Frame>
  ),
};

/** Clean build, no run yet. Console pane shows the "press Run" placeholder. */
export const CleanBuild: Story = {
  render: () => (
    <Frame>
      <BuildOutput state={CLEAN_BUILD} />
    </Frame>
  ),
};

/** Clean build + successful run with multi-line stdout. */
export const CleanRun: Story = {
  render: () => (
    <Frame>
      <BuildOutput state={CLEAN_RUN} />
    </Frame>
  ),
};

/** Build failed with one error + one warning, no run. */
export const BuildErrors: Story = {
  render: () => (
    <Frame>
      <BuildOutput state={BUILD_ERRORS} />
    </Frame>
  ),
};

/** Clean build, but the script threw at runtime. stderr line in red. */
export const RuntimeError: Story = {
  render: () => (
    <Frame>
      <BuildOutput state={RUNTIME_ERROR} />
    </Frame>
  ),
};

/** Build in progress — pane shows the empty-state until results arrive. */
export const Building: Story = {
  render: () => (
    <Frame>
      <BuildOutput state={BUSY_BUILD} />
    </Frame>
  ),
};
