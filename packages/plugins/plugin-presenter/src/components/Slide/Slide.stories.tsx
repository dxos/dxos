//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useEffect, useMemo, useState } from 'react';
import { expect, waitFor, within } from 'storybook/test';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as Surface from '@dxos/app-framework/Surface';
import { withPluginManager } from '@dxos/app-framework/testing';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { MermaidEngine, type Scene } from '@dxos/diagram';
import { Filter, Obj } from '@dxos/echo';
import { useObject, useResolveRef } from '@dxos/echo-react';
import { DXN, EID, EntityId } from '@dxos/keys';
import { log } from '@dxos/log';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as SceneSvg from '@dxos/plugin-illustrator/SceneSvg';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { type Space, useQuery } from '@dxos/react-client/echo';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';

import { type SlideSource } from '#deck';
import { createSlide } from '#testing';
import { translations } from '#translations';
import { Presentation } from '#types';

import { SlideArticle } from '../../containers/SlideArticle/SlideArticle.tsx';
import { MarkdownSlide } from '../MarkdownSlide/index.ts';
import * as Slide from './Slide.tsx';

/** One slide inset in a void, as the slide preview shows it. */
const SlideView = ({ source }: { source: SlideSource }) => (
  <Slide.Root source={source}>
    <Slide.Frame inset>
      <Slide.Content />
    </Slide.Frame>
  </Slide.Root>
);

const DocumentSlide = ({ subject }: { subject: Markdown.Document }) => {
  const [content] = useObject(subject.content, 'content');
  return <MarkdownSlide content={content ?? ''} />;
};

const DIAGRAM = ['flowchart LR', '  Client --> Echo', '  Echo --> Edge'].join('\n');

/**
 * Slide surface for a Drawing. The illustrator plugin's own surface delegates to a canvas variant (tldraw,
 * excalidraw), so this draws a fixed diagram with its SceneSvg renderer instead of loading a variant.
 */
const DrawingSlide = (_props: { subject: Drawing.Drawing }) => {
  const [objects, setObjects] = useState<Scene.WorldObject[]>([]);
  useEffect(() => {
    let cancelled = false;
    MermaidEngine.compile(DIAGRAM).then(
      (commands) =>
        !cancelled &&
        setObjects(commands.flatMap((command) => (command.op === 'upsert-object' ? [command.object] : []))),
      (error: unknown) => log.catch(error),
    );
    return () => {
      cancelled = true;
    };
  }, []);
  return <SceneSvg.SceneSvg classNames='grow' objects={objects} />;
};

const createSlidePlugin = (options: { gated?: boolean; article?: boolean } = {}) =>
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
              // The production article renders the document's own `<Surface>`s, which recursion stories need.
              component: options.article ? SlideArticle : DocumentSlide,
              props: ({ data }) => ({ ...data }),
            }),
            Surface.create({
              id: 'drawing',
              filter: AppSurface.object(AppSurface.Slide, Drawing.Drawing),
              component: DrawingSlide,
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
      <SlideView source={source} />
    </>
  );
};

const surfaceTag = (eid: string) => `<Surface ref="${eid}" />`;

/** Replaces a document's markdown, for content that names the document's own id. */
const setContent = (document: Markdown.Document, content: string) => {
  const text = document.content.target;
  if (text) {
    Obj.update(text, (text) => {
      text.content = content;
    });
  }
};

/** Slide content per story, built from objects the space creates so refs carry their real ids. */
const createSpaceSlides = async ({ space }: { space: Space }) => {
  const embedded = space.db.add(
    Drawing.make({ name: 'Embedded', canvas: Drawing.makeCanvas({ schema: 'dxos.org/scene/1' }) }),
  );
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
      name: 'embedded-image',
      slides: [
        ['---', 'layout: image', '---', '# Over the drawing', surfaceTag(EID.make({ entityId: embedded.id }))].join(
          '\n',
        ),
      ],
    }),
  );
  space.db.add(
    Presentation.make({
      name: 'embedded-bleed',
      slides: [
        [
          '---',
          'layout: two-cols',
          'bleed: right',
          '---',
          '# Edge to edge',
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
  space.db.add(
    Presentation.make({
      name: 'unresolvable',
      slides: [
        [
          '---',
          'layout: two-cols',
          '---',
          surfaceTag('echo:///not-an-id'),
          '::right::',
          surfaceTag(EID.make({ entityId: EntityId.random() })),
        ].join('\n'),
      ],
    }),
  );
  const self = space.db.add(Markdown.make({ name: 'self', content: '' }));
  setContent(self, `# Self\n\n${surfaceTag(EID.make({ entityId: self.id }))}`);
  const cycleA = space.db.add(Markdown.make({ name: 'cycle-a', content: '' }));
  const cycleB = space.db.add(Markdown.make({ name: 'cycle-b', content: '' }));
  setContent(cycleA, `# Cycle A\n\n${surfaceTag(EID.make({ entityId: cycleB.id }))}`);
  setContent(cycleB, `# Cycle B\n\n${surfaceTag(EID.make({ entityId: cycleA.id }))}`);
  space.db.add(Presentation.make({ name: 'no-ref', slides: ['# Without a ref\n\n<Surface />'] }));
  const source = space.db.add(Presentation.make({ name: 'source' }));
  const owned = Presentation.addSlide(source, '# Embedded slide\n\nOwned by another deck');
  space.db.add(
    Presentation.make({
      name: 'embedded-text',
      slides: [
        [
          '---',
          'layout: two-cols',
          '---',
          '# Beside the slide',
          '::right::',
          surfaceTag(EID.make({ entityId: owned.id })),
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
  const slide = useResolveRef(presentation?.slides[0]);
  const target = useResolveRef(slide?.content);
  const text = target && Obj.instanceOf(Text.Text, target) ? target : undefined;
  if (!text) {
    return <Loading />;
  }

  return <SlideView source={{ kind: 'text', id: text.id, text }} />;
};

/** Renders the named document from the story space as a linked-object slide. */
const DocumentSlideStory = ({ name }: { name: string }) => {
  const { space } = useClientStory();
  const [document] = useQuery(space?.db, Filter.type(Markdown.Document, { name }));
  if (!document) {
    return <Loading />;
  }

  return <SlideView source={{ kind: 'object', id: document.id, object: document }} />;
};

const meta = {
  title: 'plugins/plugin-presenter/components/Slide',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

// Space stories wait for the story space and its fixture objects.
const LOAD_TIMEOUT = { timeout: 10_000 };

/** Only stories that read fixture objects create the space, so the others render at once. */
const withSpace = withClientProvider({
  types: [Markdown.Document, Drawing.Drawing, Drawing.Canvas, Text.Text, Presentation.Presentation],
  createIdentity: true,
  createSpace: true,
  onCreateSpace: createSpaceSlides,
});

const withSlideSurface = withPluginManager({ plugins: [createSlidePlugin()()] });

export const Text_: Story = {
  name: 'Text',
  decorators: [withSlideSurface],
  args: { kind: 'text' },
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByText('Owned slide', undefined, LOAD_TIMEOUT)).toBeVisible();
  },
};

/** An unrecognised `layout` falls back to the default layout rather than failing. */
export const UnknownLayout: Story = {
  decorators: [withSlideSurface],
  args: { kind: 'text', content: '---\nlayout: nope\n---\n# Fallback slide' },
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByRole('heading', { name: 'Fallback slide' }, LOAD_TIMEOUT),
    ).toBeVisible();
    await waitFor(() => expect(canvasElement.querySelector('[data-layout="default"]')).not.toBeNull());
    await expect(canvasElement.querySelector('[data-layout="nope"]')).toBeNull();
  },
};

export const Object_: Story = {
  name: 'Object',
  decorators: [withSlideSurface],
  args: { kind: 'object' },
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByText('Linked document', undefined, LOAD_TIMEOUT)).toBeVisible();
  },
};

export const Pending: Story = {
  decorators: [withSlideSurface],
  args: { kind: 'pending' },
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByText('Loading...', undefined, LOAD_TIMEOUT)).toBeVisible();
  },
};

/** Without a slide surface the object renders as a title slide. */
export const ObjectFallback: Story = {
  args: { kind: 'unmatched' },
  decorators: [withPluginManager({ plugins: [] })],
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByText('Unmatched', undefined, LOAD_TIMEOUT)).toBeVisible();
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

/** A `<Surface ref>` in a layout slot renders a Drawing through its slide surface, not the title-slide fallback. */
export const EmbeddedSurface: Story = {
  render: () => <SpaceSlideStory name='embedded' />,
  decorators: [withSlideSurface, withSpace],
  args: { kind: 'text' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole('heading', { name: 'Beside the document' }, LOAD_TIMEOUT)).toBeVisible();
    await waitFor(() => expect(canvasElement.querySelector('[data-embed] svg')).not.toBeNull(), LOAD_TIMEOUT);
    await expect(await canvas.findByText('Client', undefined, LOAD_TIMEOUT)).toBeInTheDocument();
  },
};

/** In the `image` layout, an embedded object fills the slide below the heading rather than collapsing to nothing. */
export const EmbeddedSurfaceImage: Story = {
  render: () => <SpaceSlideStory name='embedded-image' />,
  decorators: [withSlideSurface, withSpace],
  args: { kind: 'text' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole('heading', { name: 'Over the drawing' }, LOAD_TIMEOUT)).toBeVisible();
    await waitFor(
      () => expect(canvasElement.querySelector('[data-slot="default"] [data-embed]')).not.toBeNull(),
      LOAD_TIMEOUT,
    );
    // The slot fills the slide, so an embed with no height of its own (a canvas drawing) does not collapse.
    const slide = canvasElement.querySelector('[data-layout="image"]');
    const slot = canvasElement.querySelector('[data-layout="image"] [data-slot="default"]');
    await expect(
      (slot?.getBoundingClientRect().height ?? 0) / (slide?.getBoundingClientRect().height ?? 1),
    ).toBeGreaterThan(0.5);
  },
};

/** `bleed: right` takes the right column, and the drawing in it, to the slide's top, right and bottom edges. */
export const EmbeddedSurfaceBleed: Story = {
  render: () => <SpaceSlideStory name='embedded-bleed' />,
  decorators: [withSlideSurface, withSpace],
  args: { kind: 'text' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole('heading', { name: 'Edge to edge' }, LOAD_TIMEOUT)).toBeVisible();
    await waitFor(
      () => expect(canvasElement.querySelector('[data-slot="right"] [data-embed]')).not.toBeNull(),
      LOAD_TIMEOUT,
    );
    const slide = canvasElement.querySelector('[data-layout="two-cols"]');
    const right = canvasElement.querySelector('[data-slot="right"]');
    if (!slide || !right) {
      throw new Error('The two-cols slide did not render.');
    }
    const outer = slide.getBoundingClientRect();
    const column = right.getBoundingClientRect();
    await expect(Math.round(column.right)).toBe(Math.round(outer.right));
    await expect(Math.round(column.top)).toBe(Math.round(outer.top));
  },
};

/** A ref to a deleted object and a malformed ref each settle on the placeholder rather than spinning. */
export const EmbeddedSurfaceMissing: Story = {
  render: () => <SpaceSlideStory name='missing' />,
  decorators: [withSlideSurface, withSpace],
  args: { kind: 'text' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getAllByText('Missing object')).toHaveLength(2), LOAD_TIMEOUT);
    await expect(canvasElement.querySelector('[data-testid="presenter.embedded-surface.loading"]')).toBeNull();
  },
};

/** An ECHO-shaped but invalid ref and a well-formed ref to an id that never existed each settle on the placeholder. */
export const EmbeddedSurfaceUnresolvable: Story = {
  render: () => <SpaceSlideStory name='unresolvable' />,
  decorators: [withSlideSurface, withSpace],
  args: { kind: 'text' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getAllByText('Missing object')).toHaveLength(2), LOAD_TIMEOUT);
    await expect(canvasElement.querySelector('[data-testid="presenter.embedded-surface.loading"]')).toBeNull();
  },
};

/** `<Surface />` with no ref settles on the placeholder. */
export const EmbeddedSurfaceNoRef: Story = {
  render: () => <SpaceSlideStory name='no-ref' />,
  decorators: [withSlideSurface, withSpace],
  args: { kind: 'text' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole('heading', { name: 'Without a ref' }, LOAD_TIMEOUT)).toBeVisible();
    await waitFor(() => expect(canvas.getAllByText('Missing object')).toHaveLength(1), LOAD_TIMEOUT);
    await expect(canvasElement.querySelector('[data-testid="presenter.embedded-surface.loading"]')).toBeNull();
  },
};

/** A ref to another deck's owned slide renders that slide's markdown, not a text editor. */
export const EmbeddedTextSlide: Story = {
  render: () => <SpaceSlideStory name='embedded-text' />,
  decorators: [withSlideSurface, withSpace],
  args: { kind: 'text' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole('heading', { name: 'Beside the slide' }, LOAD_TIMEOUT)).toBeVisible();
    await waitFor(
      () => expect(canvasElement.querySelector('[data-embed] [data-slide] h1')?.textContent).toBe('Embedded slide'),
      LOAD_TIMEOUT,
    );
    await expect(canvasElement.querySelector('[data-embed] .cm-editor')).toBeNull();
  },
};

const withArticleSurface = withPluginManager({ plugins: [createSlidePlugin({ article: true })()] });

const recursivePlaceholders = (canvasElement: HTMLElement) =>
  canvasElement.querySelectorAll('[data-testid="presenter.embedded-surface.recursive"]').length;

/** A document that embeds itself renders once, with the recursion placeholder in place of the second level. */
export const EmbeddedSelf: Story = {
  render: () => <DocumentSlideStory name='self' />,
  decorators: [withArticleSurface, withSpace],
  args: { kind: 'object' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole('heading', { name: 'Self' }, LOAD_TIMEOUT)).toBeVisible();
    await waitFor(() => expect(recursivePlaceholders(canvasElement)).toBe(1), LOAD_TIMEOUT);
    await expect(canvas.getAllByRole('heading', { name: 'Self' })).toHaveLength(1);
    await expect(canvas.getByText('Embedded in itself')).toBeInTheDocument();
  },
};

/** Two documents that embed each other stop when the cycle returns to the first. */
export const EmbeddedCycle: Story = {
  render: () => <DocumentSlideStory name='cycle-a' />,
  decorators: [withArticleSurface, withSpace],
  args: { kind: 'object' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole('heading', { name: 'Cycle A' }, LOAD_TIMEOUT)).toBeVisible();
    await expect(await canvas.findByRole('heading', { name: 'Cycle B' }, LOAD_TIMEOUT)).toBeInTheDocument();
    await waitFor(() => expect(recursivePlaceholders(canvasElement)).toBe(1), LOAD_TIMEOUT);
    await expect(canvas.getAllByRole('heading', { name: 'Cycle A' })).toHaveLength(1);
  },
};

/** A markdown string as a slide; the frame scales the 2560 × 1440 canvas to fit, inset in a void. */
export const MarkdownSource: Story = {
  args: { kind: 'markdown', content: createSlide({ number: 1 }) },
};
