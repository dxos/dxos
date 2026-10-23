//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useMemo } from 'react';
import { expect, waitFor, within } from 'storybook/test';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as Surface from '@dxos/app-framework/Surface';
import { withPluginManager } from '@dxos/app-framework/testing';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Filter, Obj } from '@dxos/echo';
import { useObject, useResolveRef } from '@dxos/echo-react';
import { DXN, EID } from '@dxos/keys';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { type Space, useQuery } from '@dxos/react-client/echo';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';

import { type SlideSource } from '#deck';
import { translations } from '#translations';
import { Presentation } from '#types';

import { MarkdownSlide } from '../MarkdownSlide/index.ts';
import { SlideRenderer } from './SlideRenderer.tsx';

const DocumentSlide = ({ subject }: { subject: Markdown.Document }) => {
  const [content] = useObject(subject.content, 'content');
  return <MarkdownSlide content={content ?? ''} />;
};

const createSlidePlugin = (options: { gated?: boolean } = {}) =>
  Plugin.define(
    Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.test.presenterSlide'), name: 'PresenterSlideStory' }),
  ).pipe(
    Plugin.addModule({
      id: 'surfaces',
      ...(options.gated ? { activatesOn: ActivationEvents.SurfacesRequested(AppSurface.Slide.role) } : {}),
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

type StoryProps = { kind: SlideSource['kind'] | 'unmatched'; content?: string };

const DefaultStory = ({ kind, content }: StoryProps) => {
  const source = useMemo((): SlideSource => {
    switch (kind) {
      case 'text':
        return { kind, id: 'text', text: Text.make({ content: content ?? '# Owned slide' }) };
      case 'object':
        return {
          kind: 'object',
          id: 'object',
          object: Markdown.make({ name: 'Linked', content: '# Linked document' }),
        };
      case 'unmatched':
        return { kind: 'object', id: 'object', object: Markdown.make({ name: 'Unmatched', content: '# Hidden' }) };
      case 'markdown':
        return { kind, id: 'markdown', content: content ?? '# Raw slide' };
      case 'pending':
        return { kind, id: 'pending' };
    }
  }, [kind, content]);

  return (
    <>
      <SlideRenderer source={source} />
    </>
  );
};

const surfaceTag = (eid: string) => `<Surface ref="${eid}" />`;

/** Slide content per story, built from objects the space creates so refs carry their real ids. */
const createSpaceSlides = async ({ space }: { space: Space }) => {
  const embedded = space.db.add(Markdown.make({ name: 'Embedded', content: '# Embedded document' }));
  const deleted = space.db.add(Markdown.make({ name: 'Deleted', content: '# Deleted document' }));
  space.db.remove(deleted);
  space.db.add(
    Presentation.make({
      name: 'embedded',
      slides: [
        [
          '---',
          'layout: two-cols',
          '---',
          '# Beside the document',
          '::right::',
          surfaceTag(EID.make({ entityId: embedded.id })),
        ].join('\n'),
      ],
    }),
  );
  space.db.add(
    Presentation.make({
      name: 'missing',
      slides: [
        [
          '---',
          'layout: two-cols',
          '---',
          surfaceTag(EID.make({ entityId: deleted.id })),
          '::right::',
          surfaceTag('javascript:alert(1)'),
        ].join('\n'),
      ],
    }),
  );
  await space.db.flush({ indexes: true });
};

/** Renders the first slide of the named presentation from the story space, so the slide has an owning database. */
const SpaceSlideStory = ({ name }: { name: string }) => {
  const { space } = useClientStory();
  const [presentation] = useQuery(space?.db, Filter.type(Presentation.Presentation, { name }));
  const target = useResolveRef(presentation?.sections[0]);
  const text = target && Obj.instanceOf(Text.Text, target) ? target : undefined;
  if (!text) {
    return <Loading />;
  }

  return <SlideRenderer source={{ kind: 'text', id: text.id, text }} />;
};

const meta = {
  title: 'plugins/plugin-presenter/components/SlideRenderer',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withClientProvider({
      types: [Markdown.Document, Text.Text, Presentation.Presentation],
      createIdentity: true,
      createSpace: true,
      onCreateSpace: createSpaceSlides,
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

const LOAD_TIMEOUT = { timeout: 10_000 };

const withSlideSurface = withPluginManager({ plugins: [createSlidePlugin()()] });

export const Text_: Story = {
  name: 'Text',
  decorators: [withSlideSurface],
  args: { kind: 'text' },
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByText('Owned slide')).toBeVisible();
  },
};

/** An unrecognised `layout` falls back to the default layout rather than failing. */
export const UnknownLayout: Story = {
  decorators: [withSlideSurface],
  args: { kind: 'text', content: '---\nlayout: nope\n---\n# Fallback slide' },
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByRole('heading', { name: 'Fallback slide' })).toBeVisible();
    await waitFor(() => expect(canvasElement.querySelector('[data-layout="default"]')).not.toBeNull());
    await expect(canvasElement.querySelector('[data-layout="nope"]')).toBeNull();
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

/** The slide surface module is gated on its role's demand, as in production; mounting the slide requests it. */
export const GatedSurface: Story = {
  args: { kind: 'object' },
  decorators: [withPluginManager({ plugins: [createSlidePlugin({ gated: true })()] })],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Linked document', undefined, { timeout: 10_000 })).toBeVisible();
    await expect(canvas.queryByText('Linked', { exact: true })).toBeNull();
  },
};

/** A `<Surface ref>` in a layout slot renders the referenced object through the app's slide surface. */
export const EmbeddedSurface: Story = {
  render: () => <SpaceSlideStory name='embedded' />,
  decorators: [withSlideSurface],
  args: { kind: 'text' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole('heading', { name: 'Beside the document' }, LOAD_TIMEOUT)).toBeVisible();
    await expect(await canvas.findByRole('heading', { name: 'Embedded document' }, LOAD_TIMEOUT)).toBeVisible();
  },
};

/** A ref to a deleted object and a malformed ref each settle on the placeholder rather than spinning. */
export const EmbeddedSurfaceMissing: Story = {
  render: () => <SpaceSlideStory name='missing' />,
  decorators: [withSlideSurface],
  args: { kind: 'text' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getAllByText('Missing object')).toHaveLength(2), LOAD_TIMEOUT);
    await expect(canvasElement.querySelector('[data-testid="presenter.embedded-surface.loading"]')).toBeNull();
  },
};
