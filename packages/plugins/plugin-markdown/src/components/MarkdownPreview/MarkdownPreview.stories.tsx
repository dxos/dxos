//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react-vite';
import React from 'react';

import { IntentPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Obj, Ref } from '@dxos/echo';
import { DocumentType } from '@dxos/plugin-markdown/types';
import { faker } from '@dxos/random';
import { Icon, Popover } from '@dxos/react-ui';
import { DataType } from '@dxos/schema';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { MarkdownPreview } from './MarkdownPreview';
import { translations } from '../../translations';

faker.seed(1234);

const meta: Meta<typeof MarkdownPreview> = {
  title: 'plugins/plugin-markdown/MarkdownPreview',
  component: MarkdownPreview,
  render: ({ subject }) => {
    return (
      <Popover.Root open>
        <Popover.Content>
          <Popover.Viewport>
            <MarkdownPreview subject={subject} role='popover' />
          </Popover.Viewport>
          <Popover.Arrow />
        </Popover.Content>
        <Popover.Trigger>
          <Icon icon='ph--text-aa--regular' size={5} />
        </Popover.Trigger>
      </Popover.Root>
    );
  },
  decorators: [
    withPluginManager({
      plugins: [IntentPlugin()],
    }),
    withTheme,
    withLayout(),
  ],
  parameters: {
    layout: 'centered',
    translations,
  },
};

export default meta;

const data = (() => {
  const document = Obj.make(DocumentType, {
    name: faker.lorem.words(3),
    content: Ref.make(
      Obj.make(DataType.Text, {
        content: faker.lorem.paragraphs(3),
      }),
    ),
  });

  return { document };
})();

export const Default = {
  args: {
    subject: Obj.make(DocumentType, data.document),
  },
};
