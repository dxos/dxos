//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useEffect, useMemo } from 'react';
import { expect, waitFor, within } from 'storybook/test';

import * as ActivationEvent from '@dxos/app-framework/ActivationEvent';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as PluginManagerProvider from '@dxos/app-framework/PluginManagerProvider';
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

const LATE_EVENT = ActivationEvent.make('org.dxos.plugin.test.presenterSlideLate');

/** Fires the late event after mount, standing in for a lazily gated role module loading. */
const LateActivator = ({ delayMs }: { delayMs: number }) => {
  const manager = PluginManagerProvider.usePluginManager();
  useEffect(() => {
    Effect.runFork(Effect.sleep(delayMs).pipe(Effect.andThen(manager.activate(LATE_EVENT))));
  }, [manager, delayMs]);
  return null;
};

const createSlidePlugin = (activatesOn?: ActivationEvent.ActivationEvent) =>
  Plugin.define(
    Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.test.presenterSlide'), name: 'PresenterSlideStory' }),
  ).pipe(
    Plugin.addModule({
      id: 'surfaces',
      ...(activatesOn ? { activatesOn } : {}),
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

type StoryProps = { kind: SlideSource['kind'] | 'unmatched' | 'late' };

const DefaultStory = ({ kind }: StoryProps) => {
  const source = useMemo((): SlideSource => {
    switch (kind) {
      case 'text':
        return { kind, id: 'text', text: Text.make({ content: '# Owned slide' }) };
      case 'object':
      case 'late':
        return {
          kind: 'object',
          id: 'object',
          object: Markdown.make({ name: 'Linked', content: '# Linked document' }),
        };
      case 'unmatched':
        return { kind: 'object', id: 'object', object: Markdown.make({ name: 'Unmatched', content: '# Hidden' }) };
      case 'pending':
        return { kind, id: 'pending' };
    }
  }, [kind]);

  return (
    <>
      {kind === 'late' && <LateActivator delayMs={1_500} />}
      <SlideRenderer source={source} />
    </>
  );
};

const meta = {
  title: 'plugins/plugin-presenter/components/SlideRenderer',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withClientProvider({ types: [Markdown.Document, Text.Text], createIdentity: true }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

const withSlideSurface = withPluginManager({ plugins: [createSlidePlugin()()] });

export const Text_: Story = {
  name: 'Text',
  decorators: [withSlideSurface],
  args: { kind: 'text' },
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByText('Owned slide')).toBeVisible();
  },
};

export const Object_: Story = {
  name: 'Object',
  decorators: [withSlideSurface],
  args: { kind: 'object' },
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByText('Linked document')).toBeVisible();
  },
};

export const Pending: Story = {
  decorators: [withSlideSurface],
  args: { kind: 'pending' },
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByText('Loading…')).toBeVisible();
  },
};

/** Without a slide surface the object renders as a title slide. */
export const ObjectFallback: Story = {
  args: { kind: 'unmatched' },
  decorators: [withPluginManager({ plugins: [] })],
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByText('Unmatched')).toBeVisible();
  },
};

/** The slide surface registers after mount; the title slide is replaced once it does. */
export const LateSurface: Story = {
  args: { kind: 'late' },
  decorators: [withPluginManager({ plugins: [createSlidePlugin(LATE_EVENT)()] })],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Linked')).toBeVisible();
    await waitFor(async () => expect(await canvas.findByText('Linked document')).toBeVisible(), { timeout: 10_000 });
    await expect(canvas.queryByText('Linked', { exact: true })).toBeNull();
  },
};
