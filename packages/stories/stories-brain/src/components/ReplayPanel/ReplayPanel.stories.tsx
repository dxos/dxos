//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { REFERENCE, SCENARIOS } from '@dxos/brain/testing';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations } from '@dxos/react-ui/translations';

import { replayCustom, replayScenario } from './replay.ts';
import { ReplayPanel } from './ReplayPanel.tsx';

const scenario = SCENARIOS[2];
const replay = replayScenario(scenario, REFERENCE[scenario.n]);

const meta = {
  title: 'stories/stories-brain/ReplayPanel',
  component: ReplayPanel,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: { translations: [...translations, ...formTranslations] },
} satisfies Meta<typeof ReplayPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    mode: 'scenario',
    scenarioAvailable: true,
    replay,
    cursor: replay.steps.length,
    onModeChange: () => {},
    onStep: () => {},
    onRunAll: () => {},
    onReset: () => {},
    onAddFact: () => {},
    onAdvance: () => {},
  },
};

export const Custom: Story = {
  args: {
    ...Default.args,
    mode: 'custom',
    replay: replayCustom(REFERENCE[scenario.n], scenario.createdAt, [
      {
        type: 'fact',
        fact: {
          speaker: 'dima',
          quote: "OK, I'll start on the agent plugin",
          subject: 'dima',
          predicate: 'helps-with',
          object: 'agent plugin',
          force: 'commissive',
          polarity: '+',
        },
      },
      { type: 'advance', duration: '2d' },
    ]),
  },
};
