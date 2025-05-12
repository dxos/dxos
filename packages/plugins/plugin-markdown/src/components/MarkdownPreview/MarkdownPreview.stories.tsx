//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React from 'react';

import { IntentPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { create } from '@dxos/echo-schema';
import { DocumentType } from '@dxos/plugin-markdown/types';
import { faker } from '@dxos/random';
import { makeRef } from '@dxos/react-client/echo';
import { Icon, Popover } from '@dxos/react-ui';
import { DataType } from '@dxos/schema';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { MarkdownPreview } from './MarkdownPreview';
import translations from '../../translations';

faker.seed(1234);

const meta: Meta<typeof MarkdownPreview> = {
  title: 'plugins/plugin-markdown/MarkdownPreview',
  component: MarkdownPreview,
  render: ({ subject }) => {
    return (
      <Popover.Root open>
        <Popover.Content>
          <MarkdownPreview subject={subject} role='popover' />
          <Popover.Arrow />
        </Popover.Content>
        <Popover.Trigger>
          <Icon icon='ph--text-aa--regular' size={5} />
        </Popover.Trigger>
      </Popover.Root>
    );
  },
  decorators: [withPluginManager({ plugins: [IntentPlugin()] }), withTheme, withLayout({ tooltips: true })],
  parameters: {
    layout: 'centered',
    translations,
  },
};

export default meta;

const data = (() => {
  const document = create(DocumentType, {
    name: faker.lorem.words(3),
    content: makeRef(
      create(DataType.Text, {
        content: faker.lorem.paragraphs(3),
      }),
    ),
    threads: [],
  });

  return { document };
})();

export const Default = {
  args: {
    subject: create(DocumentType, data.document),
  },
};
