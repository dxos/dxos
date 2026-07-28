//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Input, ScrollArea, ScrollAreaRootProps, Toolbar } from '../../components';
import { withLayout, withTheme } from '../../testing';
import { composable, composableProps } from '../../util';
import { Panel } from './Panel';

const List = composable<HTMLDivElement, ScrollAreaRootProps>((props, forwardedRef) => {
  return (
    <ScrollArea.Root centered {...composableProps(props, { role: 'list' })} ref={forwardedRef}>
      <ScrollArea.Viewport>
        {Array.from({ length: 100 }).map((_, i) => (
          <div key={i} role='listitem' className='p-1 hover:bg-hover-surface'>
            Item {i}
          </div>
        ))}
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
});

/**
 * Panel is the standard full-height surface layout: a CSS grid whose `auto 1fr auto`
 * rows pin a toolbar and statusbar while the content region absorbs the remaining
 * height, so a scroll container inside it scrolls rather than growing the page. Each
 * region takes `asChild` to merge its grid slot onto a `Toolbar.Root` / `ScrollArea`
 * instead of nesting an extra wrapper element.
 *
 * @idiom org.dxos.react-ui.panelLayout
 *   applies: Any full-height pane with a fixed toolbar/statusbar and a scrolling body
 *   instead-of: Hand-wiring flex columns with min-height:0 and a bespoke scroll container
 *   uses: {@link Panel.Root}, {@link Panel.Toolbar}, {@link Panel.Content}, {@link Panel.Statusbar}
 *   related: org.dxos.react-ui-menu.toolbarMenu
 */
const DefaultStory = () => {
  return (
    <Panel.Root className='dx-document'>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.IconButton icon='ph--plus--regular' variant='primary' label='Add' />
          <Input.Root>
            <Input.TextInput placeholder='Search' />
          </Input.Root>
          <Toolbar.IconButton icon='ph--dots-three-vertical--regular' iconOnly label='Menu' />
        </Toolbar.Root>
      </Panel.Toolbar>

      <Panel.Content asChild>
        <List />
      </Panel.Content>

      <Panel.Statusbar asChild>
        <Toolbar.Root classNames='justify-between'>
          <Toolbar.IconButton variant='ghost' icon='ph--house--regular' iconOnly label='Add' />
          <Toolbar.IconButton variant='ghost' icon='ph--alarm--regular' iconOnly label='Status' />
        </Toolbar.Root>
      </Panel.Statusbar>
    </Panel.Root>
  );
};

const meta: Meta = {
  title: 'ui/react-ui-core/components/Panel',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
