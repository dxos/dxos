//
// Copyright 2025 DXOS.org
//

/**
 * Stories for the editor's widgets: XML tags matched by `xmlTags`, object links matched by
 * `objectLinks`, both rendered through one `widgetHost` — a CodeMirror widget creates a DOM
 * placeholder, and React portals render content into it.
 */

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { Fragment, type PropsWithChildren, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { random } from '@dxos/random';
import { Card, Icon, Popover, useThemeContext } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import {
  type ObjectLinkProps,
  type ObjectLinksOptions,
  type WidgetDef,
  type WidgetState,
  type XmlWidgetRegistry,
  createBasicExtensions,
  createThemeExtensions,
  decorateMarkdown,
  extendedMarkdown,
  image,
  objectLinks,
  widgetHost,
  xmlTags,
} from '@dxos/ui-editor';
import { type PreviewLinkRef, type PreviewLinkTarget } from '@dxos/ui-types';
import { safeParseInt, trim } from '@dxos/util';

import { EditorPreviewProvider, useEditorPreview } from '../components';
import { useTextEditor } from '../hooks';

random.seed(123);

//
// XmlTags helpers
//

const xmlRegistry = {
  test: {
    block: true,
    Component: ({ start = '0' }: { start?: string }) => {
      const [count, setCount] = useState<number>(safeParseInt(start, 0));
      useEffect(() => {
        const interval = setInterval(() => {
          setCount((prev) => {
            if (prev >= 200) {
              clearInterval(interval);
              return prev;
            }
            return prev + 1;
          });
        }, 100);
        return () => clearInterval(interval);
      }, []);
      return <div className='p-2 border border-separator rounded-sm'>Test {count}</div>;
    },
  },
} satisfies XmlWidgetRegistry;

//
// Preview helpers
//

const PreviewCard = () => {
  const { target } = useEditorPreview('PreviewCard');
  if (!target) {
    return null;
  }
  return (
    <Popover.Portal>
      <Popover.Content
        onOpenAutoFocus={(event) => event.preventDefault()}
        classNames={[
          'origin-(--transform-origin)',
          'data-[state=open]:animate-popover-in',
          'data-[state=closed]:animate-popover-out',
        ]}
      >
        <Popover.Viewport>
          <Card.Root border={false} classNames='dx-card-popover'>
            <Card.Header>
              <Card.Block>
                <Icon icon='ph--file-text--regular' />
              </Card.Block>
              <Card.Title>{target.label}</Card.Title>
              <Popover.Close asChild>
                <Card.ActionIconButton action='close' />
              </Popover.Close>
            </Card.Header>
            <Card.Row>
              <Card.Text variant='description'>{target.label}</Card.Text>
            </Card.Row>
          </Card.Root>
        </Popover.Viewport>
        <Popover.Arrow />
      </Popover.Content>
    </Popover.Portal>
  );
};

/** The story's stand-in for the app's preview lookup: an object link gets its label back. */
const handlePreviewLookup = async ({ label }: PreviewLinkRef): Promise<PreviewLinkTarget> => ({ label });

/**
 * Module scope, not inside the story: a component type created per render is a new type each time,
 * and React remounts everything under it on every render — the editor and the preview's own state.
 */
const PreviewWrapper = ({ children }: PropsWithChildren) => (
  <EditorPreviewProvider onLookup={handlePreviewLookup}>
    {children}
    <PreviewCard />
  </EditorPreviewProvider>
);

const PreviewBlockCard = ({ eid, label }: ObjectLinkProps) => {
  const [text, setText] = useState<string | undefined>();
  useEffect(() => {
    random.seed(eid.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 1));
    setText(Array.from({ length: 2 }, () => random.lorem.paragraphs()).join('\n\n'));
  }, [eid]);
  return (
    <Card.Root>
      <Card.Header>
        <Card.Block>
          <Icon icon='ph--arrow-square-up--regular' />
        </Card.Block>
        <Card.Title>{label}</Card.Title>
      </Card.Header>
      {text && (
        <Card.Row>
          <Card.Text classNames='text-description'>{text}</Card.Text>
        </Card.Row>
      )}
    </Card.Root>
  );
};

/** Obsidian-style height suffix in the image label: `![Sketch|400](echo:///…)`. */
const parseBlockHeight = (label = ''): number | undefined => {
  const match = /\|(\d+)$/.exec(label);
  return match ? Number.parseInt(match[1], 10) : undefined;
};

/**
 * Fixed-height block that mirrors the plugin-markdown sketch embed: it renders at exactly the height
 * encoded in the label, so CM's reserved `estimatedHeight` and the measured height match — the setup
 * that exercises the scroll/cull path (jitter, blank, flash, jump) without needing ECHO.
 */
const FixedHeightPreview = ({ label, eid }: ObjectLinkProps) => {
  const height = parseBlockHeight(label) ?? 200;
  return (
    <div
      style={{ height }}
      className='grid place-items-center border border-separator rounded-md bg-base-surface text-description'
    >
      {label} · {height}px · {eid}
    </div>
  );
};

/**
 * Faithfully mimics a Surface-backed embed (the real plugin-markdown block): the content mounts
 * asynchronously (like a Surface resolving) and runs an inner ResizeObserver (like the sketch's
 * auto-fit) that re-lays-out whenever the container size changes — including the 0↔height blips that
 * CM's scroll-culling produces as the node is detached and re-parented.
 *
 * NOTE: The scroll-*jump* on large scroll deltas is NOT specific to this async variant — verified via
 * Playwright, `FixedHeightPreview` (plain inert div) jumps identically. It is CM's height-estimate
 * re-anchor, not the widget. See `StubWidget` and CM #1727.
 */
const SurfaceLikePreview = ({ label, eid }: ObjectLinkProps) => {
  const height = parseBlockHeight(label) ?? 200;
  const ref = useRef<HTMLDivElement>(null);
  const [resolved, setResolved] = useState(false);

  // Async resolution, like a Surface looking up + mounting its component.
  useEffect(() => {
    const timer = setTimeout(() => setResolved(true), 30);
    return () => clearTimeout(timer);
  }, []);

  // Inner ResizeObserver that does layout work on every size change, like the sketch's auto-fit.
  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    const observer = new ResizeObserver(() => {
      // Touch layout the way an auto-fit would (read forces reflow).
      void element.clientHeight;
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ height }}
      className='grid place-items-center border border-separator rounded-md bg-base-surface text-description'
    >
      {resolved ? `Surface ${label} · ${height}px · ${eid}` : 'resolving…'}
    </div>
  );
};

//
// Story
//

/** The block widgets a `![label](echo:…)` image can render as. */
const imageWidgets: Record<string, WidgetDef<ObjectLinkProps>> = {
  card: {
    Component: PreviewBlockCard,
  },
  fixed: {
    estimatedHeight: ({ label }) => parseBlockHeight(label),
    Component: FixedHeightPreview,
  },
  surface: {
    estimatedHeight: ({ label }) => parseBlockHeight(label),
    Component: SurfaceLikePreview,
  },
};

/**
 * One editor with the widget host and both matchers, portaling the block widgets it reports; the
 * preview provider answers the chips' `DxAnchorActivate` with a card when `preview` is set.
 */
// A stable default: a fresh `{}` per render would rebuild the editor every render.
const NO_REGISTRY: XmlWidgetRegistry = {};

type StoryArgs = Pick<ObjectLinksOptions, 'trigger'> & {
  text?: string;
  /** XML tags rendered as widgets. */
  registry?: XmlWidgetRegistry;
  /** The block widget for `![label](echo:…)`; none leaves images as text. */
  image?: keyof typeof imageWidgets;
  /** Answer the anchor chips' hover/click with a preview card. */
  preview?: boolean;
};

const DefaultStory = ({ text, registry = NO_REGISTRY, image: imageWidget, trigger, preview }: StoryArgs) => {
  const { themeMode } = useThemeContext();
  const [widgets, setWidgets] = useState<WidgetState[]>([]);
  const extensions = useMemo(
    () => [
      createThemeExtensions({ themeMode }),
      createBasicExtensions({ lineWrapping: true }),
      decorateMarkdown(),
      extendedMarkdown({ registry }),
      image(),
      widgetHost({ setWidgets }),
      xmlTags({ registry }),
      objectLinks({ trigger, image: imageWidget ? imageWidgets[imageWidget] : undefined }),
    ],
    [themeMode, registry, imageWidget, trigger],
  );
  const { parentRef } = useTextEditor({ initialValue: text, extensions }, [extensions]);

  const editor = (
    <>
      <div ref={parentRef} className='dx-fill p-4 overflow-auto' />
      {widgets.map(({ id, root, Component, props }) => (
        <div key={id}>{createPortal(<Component {...props} />, root)}</div>
      ))}
    </>
  );

  const Wrapper = preview ? PreviewWrapper : Fragment;
  return (
    <div className='dx-expand grid grid-cols-2'>
      <div className='dx-expand'>
        <Wrapper>{editor}</Wrapper>
      </div>
      <div className='dx-expand p-1'>
        <pre className='dx-fill border border-subdued-separator rounded-sm p-3 overflow-auto'>
          <code className='font-mono text-description text-sm'>{text}</code>
        </pre>
      </div>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-editor/Widgets',
  render: DefaultStory,
  argTypes: {
    trigger: { control: 'select', options: [undefined, 'hover', 'click'] },
    image: { control: 'select', options: [undefined, ...Object.keys(imageWidgets)] },
    preview: { control: 'boolean' },
  },
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

//
// Stories
//

const xmlTagsText = trim`
  # XML Tags

  React widget below.

  <test id="t-1" />

  <test id="t-2" start="100" />

  React widget above.
`;

/**
 * XML tag names in the document trigger React components via `xmlTags`.
 */
export const XmlTags: Story = {
  args: { text: xmlTagsText, registry: xmlRegistry },
};

const previewText = trim`
  # Preview

  This project is part of the [DXOS](echo:///123) SDK.

  ![DXOS](echo:///123)

  It consists of [ECHO](echo:///echo), [HALO](echo:///halo), and [MESH](echo:///mesh).

  ## Deep dive

  ![ECHO](echo:///echo)

  Text

`;

/**
 * Markdown image/link URLs (echo:///…) become widgets via `objectLinks`.
 * Inline anchors open their preview card on hover (the default) as well as click.
 */
export const Preview: Story = {
  args: {
    text: previewText,
    image: 'card',
    preview: true,
  },
};

/**
 * Anchors with `trigger='click'` only open the preview card on click.
 */
export const PreviewClickTrigger: Story = {
  args: {
    ...Preview.args,
    trigger: 'click',
  },
};

const filler = (marker: string) =>
  Array.from({ length: 20 }, (_, index) => `${marker} ${index + 1} - ${random.lorem.paragraphs()}`).join('\n\n');

const previewScrollText = [
  '# Preview blocks (scroll test)',
  filler('Above'),
  '![Sketch|400](echo:///sketch)',
  filler('Below'),
].join('\n\n');

/**
 * A fixed-height (400px) `echo:` block embed in a long scrollable document. Sets `estimatedHeight`
 * from the label so CM reserves the right space, matching the plugin-markdown sketch embed. Use this
 * to reproduce scroll behavior: scroll the block off-screen and back, and past the viewport edges.
 */
export const PreviewScroll: Story = {
  args: {
    text: previewScrollText,
    image: 'fixed',
  },
};

/**
 * Same long scrollable document as `PreviewScroll`, but the block renders a Surface-like component
 * (async mount + inner ResizeObserver). Use this to reproduce the scroll jump that only appears with
 * Surface-backed embeds, and to verify fixes against it.
 */
export const PreviewScrollSurface: Story = {
  args: {
    text: previewScrollText,
    image: 'surface',
  },
};
