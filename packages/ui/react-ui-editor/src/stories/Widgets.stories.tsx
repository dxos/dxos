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
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { random } from '@dxos/random';
import { Card, Icon, Popover, useThemeContext } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import {
  AnchorInlineWidget,
  type PreviewLinkRef,
  type PreviewLinkTarget,
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
import { safeParseInt, trim } from '@dxos/util';

import { EditorPreviewProvider, useEditorPreview } from '../components';
import { useTextEditor } from '../hooks';
import { EditorStory } from './components';

// ----------------------------------------------------------------------------
// XmlTags helpers
// ----------------------------------------------------------------------------

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

// ----------------------------------------------------------------------------
// Preview helpers
// ----------------------------------------------------------------------------

const handlePreviewLookup = async ({ dxn, label }: PreviewLinkRef): Promise<PreviewLinkTarget> => {
  random.seed(dxn.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 1));
  const text = Array.from({ length: 2 }, () => random.lorem.paragraphs()).join('\n\n');
  return { label, text };
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

// ----------------------------------------------------------------------------
// Meta
// ----------------------------------------------------------------------------

const meta = {
  title: 'ui/react-ui-editor/Widgets',
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// ----------------------------------------------------------------------------
// Stories
// ----------------------------------------------------------------------------

const xmlTagsText = trim`
  # XML Tags

  React widget below.

  <test id="t-1" />

  <test id="t-2" start="100" />

  React widget above.
`;

/**
 * XML tag names in the document trigger React components via xmlTags / PlaceholderWidget.
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

`;

/**
 * Markdown image/link URLs (echo:/…) trigger block widgets via xmlTags / PlaceholderWidget.
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
                label && dxn ? new AnchorInlineWidget(label, dxn) : null,
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
