//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import * as ProcessManagerPlugin from '@dxos/app-framework/ProcessManagerPlugin';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Filter, Obj } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import * as CorePlugins from '@dxos/plugin-testing/CorePlugins';
import { random } from '@dxos/random';
import { useSpaces } from '@dxos/react-client/echo';
import { translations as editorTranslations } from '@dxos/react-ui-editor/translations';
import { CardContainer } from '@dxos/react-ui-mosaic/testing';
import * as Card from '@dxos/react-ui/Card';
import * as DragHandle from '@dxos/react-ui/DragHandle';
import { Loading, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';

import { translations } from '#translations';
import { Markdown } from '#types';

import { EditableMarkdownCard, type EditableMarkdownCardProps } from './EditableMarkdownCard.tsx';

random.seed(1234);

const EditableMarkdownCardStory = ({ ...args }: Omit<EditableMarkdownCardProps, 'subject'>) => {
  const [space] = useSpaces();
  const [doc] = useQuery(space?.db, Filter.type(Markdown.Document));
  if (!doc) {
    return <Loading data={{ space: !!space }} />;
  }

  return (
    <CardContainer icon='ph--text-aa--regular'>
      <Card.Root border={false}>
        <Card.Header>
          <DragHandle.DragHandle />
          <Card.Title>{Obj.getLabel(doc)}</Card.Title>
        </Card.Header>
        <EditableMarkdownCard subject={doc} {...args} />
      </Card.Root>
    </CardContainer>
  );
};

const meta: Meta<typeof EditableMarkdownCardStory> = {
  title: 'plugins/plugin-markdown/containers/EditableMarkdownCard',
  component: EditableMarkdownCardStory,
  decorators: [
    withTheme(),
    withPluginManager({
      plugins: [
        ...CorePlugins.make(),
        ProcessManagerPlugin.make(),
        ClientPlugin.make({
          types: [Markdown.Document, Text.Text],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { defaultSpace } = yield* initializeIdentity(client);
              defaultSpace.db.add(
                Markdown.make({
                  name: random.lorem.words(3),
                  content: '# Title\n' + random.lorem.paragraphs(3),
                }),
              );
            }),
        }),
      ],
    }),
  ],
  parameters: {
    layout: 'centered',
    translations: [...translations, ...editorTranslations],
  },
  tags: ['cards'],
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
