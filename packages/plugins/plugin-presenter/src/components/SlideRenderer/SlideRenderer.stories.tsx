//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useMemo } from 'react';
import { expect, within } from 'storybook/test';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as Surface from '@dxos/app-framework/Surface';
import { withPluginManager } from '@dxos/app-framework/testing';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { useObject } from '@dxos/echo-react';
import { DXN } from '@dxos/keys';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';

import { type SlideSource } from '#deck';
import { translations } from '#translations';

import { Slide } from '../Slide/index.ts';
import { SlideRenderer } from './SlideRenderer.tsx';

const DocumentSlide = ({ subject }: { subject: Markdown.Document }) => {
  const [content] = useObject(subject.content, 'content');
  return <Slide content={content} />;
};

const SlidePlugin = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.test.presenterSlide'), name: 'PresenterSlideStory' }),
).pipe(
  Plugin.addModule({
    id: 'surfaces',
    provides: [Capabilities.ReactSurface],
    activate: () =>
      Effect.succeed(
        Capability.contribute(Capabilities.ReactSurface, [
          Surface.create({
            id: 'slide',
            filter: AppSurface.object(AppSurface.Slide, Markdown.Document),
            component: DocumentSlide,
            props: ({ data }) => ({ ...data }),
          }),
        ]),
      ),
  }),
  Plugin.make,
);

type StoryProps = { kind: SlideSource['kind'] };

const DefaultStory = ({ kind }: StoryProps) => {
  const source = useMemo((): SlideSource => {
    switch (kind) {
      case 'text':
        return { kind, id: 'text', text: Text.make({ content: '# Owned slide' }) };
      case 'object':
        return { kind, id: 'object', object: Markdown.make({ name: 'Linked', content: '# Linked document' }) };
      case 'pending':
        return { kind, id: 'pending' };
    }
  }, [kind]);

  return <SlideRenderer source={source} />;
};

const meta = {
  title: 'plugins/plugin-presenter/components/SlideRenderer',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withClientProvider({ types: [Markdown.Document, Text.Text], createIdentity: true }),
    withPluginManager({ plugins: [SlidePlugin()] }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Text_: Story = {
  name: 'Text',
  args: { kind: 'text' },
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByText('Owned slide')).toBeVisible();
  },
};

export const Object_: Story = {
  name: 'Object',
  args: { kind: 'object' },
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByText('Linked document')).toBeVisible();
  },
};

export const Pending: Story = {
  args: { kind: 'pending' },
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByText('Loading…')).toBeVisible();
  },
};
