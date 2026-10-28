//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import * as Layout from '@dxos/react-ui/Layout';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';

import { translations } from '#translations';

import FILE_SYSTEM_REVIEW from '../../../../plugin-file-system/PLUGIN.review.mdl?raw';
import { VERDICT_STATUSES, parseReview } from '../SpecModel/index.ts';
import { VerdictCard } from './VerdictCard.tsx';

/** A real review written by the spec-review skill, so the cards carry real ids, notes and evidence. */
const REVIEW = parseReview(FILE_SYSTEM_REVIEW);

const meta = {
  title: 'plugins/plugin-code/components/VerdictCard',
  component: VerdictCard,
  decorators: [withTheme(), withLayout({ layout: 'column', classNames: 'w-card-default-width p-4' })],
  parameters: { translations: [...translations, ...reactUiTranslations] },
  args: { onReveal: () => {}, onOpenCode: () => {} },
} satisfies Meta<typeof VerdictCard>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The verdict a reviewer reads first: the item the code does not do at all. */
export const Missing: Story = {
  args: { verdict: REVIEW.verdicts.find(({ status }) => status === 'missing') ?? REVIEW.verdicts[0] },
};

/** One card per status, worst last, so the status icon, colour and tag read the same everywhere. */
export const EveryStatus: Story = {
  args: { verdict: REVIEW.verdicts[0] },
  render: (args) => (
    <Layout.Flex column gap='sm'>
      {VERDICT_STATUSES.map((status) => {
        const verdict = REVIEW.verdicts.find((candidate) => candidate.status === status);
        return verdict && <VerdictCard key={status} {...args} verdict={verdict} />;
      })}
    </Layout.Flex>
  ),
};
