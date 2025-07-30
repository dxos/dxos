//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react-vite';
import React from 'react';

import { IntentPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Obj, Ref } from '@dxos/echo';
import { Document } from '@dxos/plugin-markdown/types';
import { faker } from '@dxos/random';
import { CardContainer } from '@dxos/react-ui-stack/testing';
import { DataType } from '@dxos/schema';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { MarkdownPreview } from './MarkdownPreview';
import { translations } from '../../translations';

faker.seed(1234);

const meta: Meta<typeof MarkdownPreview> = {
  title: 'Cards/plugin-markdown',
  component: MarkdownPreview,
  render: ({ role, subject, ...args }) => {
    return (
      <CardContainer icon='ph--text-aa--regular' role={role}>
        <MarkdownPreview subject={subject} role={role} />
      </CardContainer>
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
  const document = Obj.make(Document.Document, {
    name: faker.lorem.words(3),
    content: Ref.make(
      Obj.make(DataType.Text, {
        content: faker.lorem.paragraphs(3),
      }),
    ),
  });

  return { document };
})();

export const Popover = {
  args: {
    subject: Obj.make(Document.Document, data.document),
    role: 'card--popover',
  },
};

export const Extrinsic = {
  args: {
    subject: Obj.make(Document.Document, data.document),
    role: 'card--extrinsic',
  },
};

export const Intrinsic = {
  args: {
    subject: Obj.make(Document.Document, data.document),
    role: 'card--intrinsic',
  },
};
