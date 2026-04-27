//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

// Side-effect import registers the `<dx-anchor>` custom element. Without this `<DxAnchor>`
// renders as `HTMLUnknownElement` and never dispatches `DxAnchorActivate` on click.
import '@dxos/lit-ui';
import { DxAnchor } from '@dxos/lit-ui/react';
import { Card, Popover } from '@dxos/react-ui';
import { EditorPreviewProvider, useEditorPreview } from '@dxos/react-ui-editor';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

/**
 * Minimal end-to-end demo of the click → popover flow that `EditorPreviewProvider` wires up.
 *
 * Pieces:
 *  - `<DxAnchor dxn=…>label</DxAnchor>`: a React wrapper around the `<dx-anchor>` Lit element
 *    that fires `DxAnchorActivate` on click.
 *  - `<EditorPreviewProvider onLookup>`: owns the `Popover.Root`, listens for
 *    `DxAnchorActivate` events on its inner host, runs `onLookup(link)` to resolve target data,
 *    then opens the popover anchored to the clicked element.
 *  - `<PreviewCard>`: reads the resolved target via `useEditorPreview` and renders content
 *    into the same `Popover.Root` via `Popover.Portal`.
 */
const PreviewCard = () => {
  const { target } = useEditorPreview('PreviewCard');
  if (!target) {
    return null;
  }

  return (
    <Popover.Portal>
      <Popover.Content onOpenAutoFocus={(event) => event.preventDefault()}>
        <Popover.Viewport classNames='dx-card-popover-width'>
          <Card.Root>
            <Card.Heading>{target.label}</Card.Heading>
            {target.text && (
              <Card.Text variant='description' classNames='line-clamp-3'>
                {target.text}
              </Card.Text>
            )}
          </Card.Root>
        </Popover.Viewport>
        <Popover.Arrow />
      </Popover.Content>
    </Popover.Portal>
  );
};

const DefaultStory = () => {
  return (
    <EditorPreviewProvider onLookup={async ({ dxn, label }) => ({ label, text: dxn })}>
      <div role='none' className='flex flex-col gap-2 p-4'>
        <p>
          Click{' '}
          <DxAnchor rootclassname='dx-tag--anchor' dxn='dxn:echo:@:01KQ7W30T1ZG06DB56C45NTCEA'>
            DXOS
          </DxAnchor>{' '}
          to open the popover.
        </p>
      </div>
      <PreviewCard />
    </EditorPreviewProvider>
  );
};

const meta = {
  title: 'plugins/plugin-assistant/components/ChatThread/Anchor',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
