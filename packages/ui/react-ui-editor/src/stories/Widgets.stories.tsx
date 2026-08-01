//
// Copyright 2025 DXOS.org
//

/**
 * Stories demonstrating the xmlTags widget-portal mechanism in ui-editor.
 *
 * Both XmlTags and Preview stories use the same underlying pattern: a CodeMirror WidgetType
 * creates a DOM placeholder, and React portals render content into it.
 */

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { random } from '@dxos/random';
import { Card, Icon, Popover, useThemeContext } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import {
  AnchorWidget,
  type XmlWidgetProps,
  type XmlWidgetRegistry,
  type XmlWidgetState,
  createBasicExtensions,
  createThemeExtensions,
  decorateMarkdown,
  extendedMarkdown,
  image,
  xmlTags,
} from '@dxos/ui-editor';
import { type PreviewLinkRef, type PreviewLinkTarget } from '@dxos/ui-types';
import { safeParseInt, trim } from '@dxos/util';

import { EditorPreviewProvider, useEditorPreview } from '../components';
import { useTextEditor } from '../hooks';
import { EditorStory } from './components';

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

const XmlTagsStory = ({ text }: { text?: string }) => {
  const { themeMode } = useThemeContext();
  const [widgets, setWidgets] = useState<XmlWidgetState[]>([]);
  const { parentRef } = useTextEditor({
    initialValue: text,
    extensions: [
      createThemeExtensions({ themeMode }),
      createBasicExtensions({ lineWrapping: true }),
      decorateMarkdown(),
      extendedMarkdown({ registry: xmlRegistry }),
      xmlTags({ registry: xmlRegistry, setWidgets }),
    ],
  });

  return (
    <>
      <div ref={parentRef} className='w-full p-4' />
      {widgets.map(({ id, root, Component, props }) => (
        <div key={id}>{createPortal(<Component {...props} />, root)}</div>
      ))}
    </>
  );
};

//
// Preview helpers
//

const handlePreviewLookup = async ({ dxn, label }: PreviewLinkRef): Promise<PreviewLinkTarget> => {
  random.seed(dxn.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 1));
  return { label };
};

const PreviewCard = () => {
  const { target } = useEditorPreview('PreviewCard');
  if (!target) {
    return null;
  }
  return (
    <Popover.Portal>
      <Popover.Content onOpenAutoFocus={(event) => event.preventDefault()}>
        <Popover.Viewport classNames='dx-card-popover-width'>
          <Card.Root border={false}>
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

const PreviewBlockCard = ({ dxn, label }: XmlWidgetProps<{ dxn: string; label: string }>) => {
  const [text, setText] = useState<string | undefined>();
  useEffect(() => {
    random.seed(dxn.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 1));
    setText(Array.from({ length: 2 }, () => random.lorem.paragraphs()).join('\n\n'));
  }, [dxn]);
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
          <Card.Text className='text-description'>{text}</Card.Text>
        </Card.Row>
      )}
    </Card.Root>
  );
};

/** Obsidian-style height suffix in the image label: `![Sketch|400](echo:/…)`. */
const parseBlockHeight = (label = ''): number | undefined => {
  const match = /\|(\d+)$/.exec(label);
  return match ? Number.parseInt(match[1], 10) : undefined;
};

/**
 * Fixed-height block that mirrors the plugin-markdown sketch embed: it renders at exactly the height
 * encoded in the label, so CM's reserved `estimatedHeight` and the measured height match — the setup
 * that exercises the scroll/cull path (jitter, blank, flash, jump) without needing ECHO.
 */
const FixedHeightPreview = ({ label, dxn }: XmlWidgetProps<{ label: string; dxn: string }>) => {
  const height = parseBlockHeight(label) ?? 200;
  return (
    <div
      style={{ height }}
      className='grid place-items-center border border-separator rounded-md bg-base-surface text-description'
    >
      {label} · {height}px · {dxn}
    </div>
  );
};

/**
 * Faithfully mimics a Surface-backed embed (the real plugin-markdown block): the content mounts
 * asynchronously (like a Surface resolving) and runs an inner ResizeObserver (like the sketch's
 * auto-fit) that re-lays-out whenever the container size changes — including the 0↔height blips that
 * CM's scroll-culling produces as the kept-alive node is detached and re-parented. This is the
 * differentiator from `FixedHeightPreview` (a plain, inert div that does not jump).
 */
const SurfaceLikePreview = ({ label, dxn }: XmlWidgetProps<{ label: string; dxn: string }>) => {
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
      {resolved ? `Surface ${label} · ${height}px · ${dxn}` : 'resolving…'}
    </div>
  );
};

//
// Meta
//

const meta = {
  title: 'ui/react-ui-editor/Widgets',
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

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
 * XML tag names in the document trigger React components via xmlTags.
 */
export const XmlTags: Story = {
  render: () => <XmlTagsStory text={xmlTagsText} />,
};

const previewText = trim`
  # Preview

  This project is part of the [DXOS](echo:/123) SDK.

  ![DXOS](echo:/123)

  It consists of [ECHO](echo:/echo), [HALO](echo:/halo), and [MESH](echo:/mesh).

  ## Deep dive

  ![ECHO](echo:/echo)

  Text

`;

/**
 * Markdown image/link URLs (echo:/…) trigger block widgets via xmlTags.
 */
export const Preview: Story = {
  render: () => {
    const [widgets, setWidgets] = useState<XmlWidgetState[]>([]);
    const extensions = useMemo(
      () => [
        image(),
        xmlTags({
          registry: {
            'dxn-preview': {
              block: true,
              urlSchemes: ['dxn:', 'echo:'],
              Component: PreviewBlockCard,
            },
            'link-preview': {
              block: false,
              urlSchemes: ['dxn:', 'echo:'],
              factory: ({ label, dxn }: XmlWidgetProps<{ label: string; dxn: string }>) =>
                label && dxn ? new AnchorWidget(label, dxn) : null,
            },
          },
          setWidgets,
        }),
      ],
      [],
    );

    return (
      <EditorPreviewProvider onLookup={handlePreviewLookup}>
        <EditorStory text={previewText} extensions={extensions} />
        <PreviewCard />
        {widgets.map(({ id, root, Component, props }) => (
          <div key={id}>{createPortal(<Component {...props} />, root)}</div>
        ))}
      </EditorPreviewProvider>
    );
  },
};

const filler = (marker: string) =>
  Array.from({ length: 20 }, (_, index) => `${marker} ${index + 1} - ${random.lorem.paragraphs()}`).join('\n\n');

const previewScrollText = [
  '# Preview blocks (scroll test)',
  filler('Above'),
  '![Sketch|400](echo:/sketch)',
  filler('Below'),
].join('\n\n');

/**
 * A fixed-height (400px) `echo:` block embed in a long scrollable document. Sets `estimatedHeight`
 * from the label so CM reserves the right space, matching the plugin-markdown sketch embed. Use this
 * to reproduce scroll behavior: scroll the block off-screen and back, and past the viewport edges.
 */
export const PreviewScroll: Story = {
  render: () => {
    const [widgets, setWidgets] = useState<XmlWidgetState[]>([]);
    const extensions = useMemo(
      () => [
        xmlTags({
          registry: {
            'dxn-preview': {
              block: true,
              urlSchemes: ['dxn:', 'echo:'],
              estimatedHeight: ({ label }: XmlWidgetProps<{ label?: string }>) => parseBlockHeight(label),
              Component: FixedHeightPreview,
            },
          },
          setWidgets,
        }),
      ],
      [],
    );

    return (
      <>
        <EditorStory text={previewScrollText} extensions={extensions} />
        {widgets.map(({ id, root, Component, props }) => (
          <div key={id}>{createPortal(<Component {...props} />, root)}</div>
        ))}
      </>
    );
  },
};

/**
 * Same long scrollable document as `PreviewScroll`, but the block renders a Surface-like component
 * (async mount + inner ResizeObserver). Use this to reproduce the scroll jump that only appears with
 * Surface-backed embeds, and to verify fixes against it.
 */
export const PreviewScrollSurface: Story = {
  render: () => {
    const [widgets, setWidgets] = useState<XmlWidgetState[]>([]);
    const extensions = useMemo(
      () => [
        xmlTags({
          registry: {
            'dxn-preview': {
              block: true,
              urlSchemes: ['dxn:', 'echo:'],
              estimatedHeight: ({ label }: XmlWidgetProps<{ label?: string }>) => parseBlockHeight(label),
              Component: SurfaceLikePreview,
            },
          },
          setWidgets,
        }),
      ],
      [],
    );

    return (
      <>
        <EditorStory text={previewScrollText} extensions={extensions} />
        {widgets.map(({ id, root, Component, props }) => (
          <div key={id}>{createPortal(<Component {...props} />, root)}</div>
        ))}
      </>
    );
  },
};
