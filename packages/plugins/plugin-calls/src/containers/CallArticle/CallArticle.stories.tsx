//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { Obj, Ref } from '@dxos/echo';
import { withLayout } from '@dxos/react-ui/testing';

import { Call } from '#types';

import { makeCallState, makeUser, useSeedCallManager, withCallManager } from '../../testing';
import { CallArticle } from './CallArticle';

const self = makeUser('self', 'Alice');
const state = makeCallState(self, [self, makeUser('bob', 'Bob'), makeUser('carol', 'Carol', { raisedHand: true })]);

const DefaultStory = () => {
  useSeedCallManager(state);
  // CallArticle reads only the CallManager; the subject merely satisfies the article surface contract.
  const subject = useMemo(
    () =>
      Call.make({
        name: 'Standup',
        transport: {
          kind: Call.CLOUDFLARE_TRANSPORT_KIND,
          config: Ref.make(Obj.make(Call.CloudflareTransportConfig, { roomId: 'story-room' })),
        },
      }),
    [],
  );
  return <CallArticle subject={subject} attendableId={Obj.getURI(subject)} />;
};

const meta = {
  title: 'plugins/plugin-calls/containers/CallArticle',
  render: DefaultStory,
  decorators: [withCallManager(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
