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
import { DataType } from '@dxos/schema';
import { withTheme, withLayout, PopoverCardContainer } from '@dxos/storybook-utils';

import { MarkdownPreview } from './MarkdownPreview';
import { translations } from '../../translations';

faker.seed(1234);

const meta: Meta<typeof MarkdownPreview> = {
  title: 'Cards/plugin-markdown/Popover',
  component: MarkdownPreview,
  render: ({ subject }) => {
    return (
      <PopoverCardContainer icon='ph--text-aa--regular'>
        <MarkdownPreview subject={subject} role='popover' />
      </PopoverCardContainer>
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
