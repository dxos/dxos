//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, waitFor } from 'storybook/test';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { SIZES } from '../../sizes.ts';
import { GEOMETRY, byTestId, controlSize, expectScoped, sizeRow } from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';
import { Block } from '../Block/Block.tsx';
import { Button } from '../Button/Button.tsx';
import { Container, type CSSVariables } from '../Container/Container.tsx';
import * as Icon from '../Icon/Icon.tsx';
import * as ScrollArea from '../ScrollArea/ScrollArea.tsx';
import * as Toolbar from '../Toolbar/Toolbar.tsx';
import * as Typography from '../Typography/Typography.tsx';
import * as Panel from './Panel.tsx';

/** A narrow reading width, so the story's pane is wider than the document. */
const READING_WIDTH: CSSVariables = { '--spacing-document-max-width': '20rem' };

/** `--dx-gutter-sm` and `--dx-gutter-md` (ui-theme spacing): the form and dialog insets, the same at every size. */
const SM_GUTTER = 8;
const MD_GUTTER = 16;

const ROWS = Array.from({ length: 30 }, (_, index) => `Item ${index + 1}`);

/**
 * A panel filling a fixed-height host: a toolbar header, 30 rows with rail icons that overflow the body (so its
 * Container names `gutter='rail'`), and a footer.
 */
const DefaultStory = ({ size = 'md' }: SizeArgs) => (
  <div data-place='full' className='h-64' data-testid={`host-${size}`}>
    <Panel.Root size={size} data-testid={`panel-${size}`}>
      <Panel.Header data-testid={`header-${size}`}>
        <Toolbar.Root>
          <Button icon='ph--plus--regular' label='Add' iconOnly data-testid={`add-${size}`} />
          <Toolbar.Text>Inbox</Toolbar.Text>
          <Button icon='ph--dots-three-vertical--regular' label='More' iconOnly />
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body asChild data-testid={`body-${size}`}>
        <ScrollArea.Root>
          <ScrollArea.Viewport asChild>
            <Container gutter='rail'>
              {ROWS.map((label, index) => (
                <Container key={label} layout='row' data-testid={index === 0 ? `row-${size}` : undefined}>
                  <Block rail='start' data-testid={index === 0 ? `rail-${size}` : undefined}>
                    <Icon.Icon icon='ph--envelope--regular' />
                  </Block>
                  <Typography.Text data-testid={index === 0 ? `text-${size}` : undefined}>{label}</Typography.Text>
                </Container>
              ))}
            </Container>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Body>
      <Panel.Footer data-testid={`footer-${size}`}>
        <Toolbar.Root>
          <Toolbar.Text>{ROWS.length} items</Toolbar.Text>
        </Toolbar.Root>
      </Panel.Footer>
    </Panel.Root>
  </div>
);

/**
 * The default panel above one whose header is empty and which has no footer, so both rows collapse to nothing (its Body
 * a plain slot with no ScrollArea), a panel at the document width, and two whose body Containers name no gutter: they
 * take the panel's (`sm` by default, `md` here), and a Container nested in one stays a subgrid.
 */
const TestStory = (args: SizeArgs) => (
  <>
    <DefaultStory {...args} />
    <div data-place='full' className='h-16' data-testid={`bare-host-${args.size}`}>
      <Panel.Root size={args.size}>
        <Panel.Header data-testid={`empty-header-${args.size}`} />
        <Panel.Body data-testid={`bare-body-${args.size}`}>
          <Typography.Text>Body</Typography.Text>
        </Panel.Body>
      </Panel.Root>
    </div>
    <div data-place='full' className='h-16' style={READING_WIDTH}>
      <Panel.Root size={args.size} width='document' data-testid={`reading-${args.size}`}>
        <Panel.Body asChild>
          <ScrollArea.Root>
            <ScrollArea.Viewport asChild>
              <Container>
                <Typography.Text data-testid={`reading-text-${args.size}`}>Reading width</Typography.Text>
              </Container>
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        </Panel.Body>
      </Panel.Root>
    </div>
    <div data-place='full' className='h-16'>
      <Panel.Root size={args.size} data-testid={`default-gutter-${args.size}`}>
        <Panel.Body asChild>
          <ScrollArea.Root>
            <ScrollArea.Viewport asChild>
              <Container data-testid={`default-gutter-body-${args.size}`}>
                <Container data-testid={`default-gutter-nested-${args.size}`}>
                  <Typography.Text data-testid={`default-gutter-text-${args.size}`}>Default gutter</Typography.Text>
                </Container>
              </Container>
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        </Panel.Body>
      </Panel.Root>
    </div>
    <div data-place='full' className='h-16'>
      <Panel.Root size={args.size} gutter='md' data-testid={`md-gutter-${args.size}`}>
        <Panel.Body>
          <Container>
            <Typography.Text data-testid={`md-gutter-text-${args.size}`}>Panel gutter</Typography.Text>
          </Container>
        </Panel.Body>
      </Panel.Root>
    </div>
  </>
);

const meta = {
  title: 'ui/react-ui-core/components/Panel',
  render: DefaultStory,
  decorators: [withSizes(), withLayout({ classNames: 'p-0 w-[32rem]' }), withTheme()],
  args: { size: 'md' },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'centered' },
} satisfies Meta<SizeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * At every size the panel fills its host and stacks a header and footer sized to their one-row toolbars (one block) and
 * the growing body with no gaps, while an empty header and a missing footer take no space and a plain Body adds no
 * frame; its `data-size` reaches the toolbar's controls and the body's rail Blocks. The body overflows and scrolls with
 * the thin overlay thumb in the end gutter. Narrowed below the collapse width, the panel (the query container)
 * collapses the body's rail gutter to the inset and hides the rail Blocks.
 */
export const Test: Story = {
  render: TestStory,
  args: { allSizes: true },
  play: async ({ canvasElement }) => {
    // `width='document'` keeps the body's content at the reading width, centred in the panel.
    const reading = byTestId(canvasElement, 'reading-md').getBoundingClientRect();
    const readingText = byTestId(canvasElement, 'reading-text-md').getBoundingClientRect();
    await expect(readingText.width).toBeCloseTo(320 - 2 * SM_GUTTER, 0);
    await expect(readingText.left - reading.left).toBeCloseTo(reading.right - readingText.right, 0);

    for (const size of SIZES) {
      const { block, inset } = GEOMETRY[size];
      const panel = byTestId(canvasElement, `panel-${size}`);
      const host = byTestId(canvasElement, `host-${size}`).getBoundingClientRect();
      const rect = panel.getBoundingClientRect();
      const header = byTestId(canvasElement, `header-${size}`).getBoundingClientRect();
      const body = byTestId(canvasElement, `body-${size}`).getBoundingClientRect();
      const footer = byTestId(canvasElement, `footer-${size}`).getBoundingClientRect();
      await expect(panel).toHaveAttribute('data-size', size);
      await expect(getComputedStyle(panel).containerType, `${size} query container`).toBe('inline-size');

      // Fills the host; the parts stack edge to edge.
      await expect(rect.height, `${size} fills height`).toBeCloseTo(host.height, 0);
      await expect(rect.width, `${size} fills width`).toBeCloseTo(host.width, 0);
      await expect(header.top, `${size} header top`).toBeCloseTo(rect.top, 0);
      await expect(header.height, `${size} toolbar header height`).toBeCloseTo(block, 0);
      await expect(body.top, `${size} body top`).toBeCloseTo(header.bottom, 0);
      await expect(footer.top, `${size} footer top`).toBeCloseTo(body.bottom, 0);
      await expect(footer.bottom, `${size} footer bottom`).toBeCloseTo(rect.bottom, 0);
      await expect(footer.height, `${size} toolbar footer height`).toBeCloseTo(block, 0);

      // An empty header and a missing footer take no space: the body fills the panel.
      const bareHost = byTestId(canvasElement, `bare-host-${size}`).getBoundingClientRect();
      const emptyHeader = byTestId(canvasElement, `empty-header-${size}`).getBoundingClientRect();
      const bareBody = byTestId(canvasElement, `bare-body-${size}`).getBoundingClientRect();
      await expect(emptyHeader.height, `${size} empty header height`).toBe(0);
      await expect(bareBody.top, `${size} bare body top`).toBeCloseTo(bareHost.top, 0);
      await expect(bareBody.bottom, `${size} bare body bottom`).toBeCloseTo(bareHost.bottom, 0);
      // A Body that composes nothing is a plain slot: no ScrollArea frame of its own.
      const bareBodyElement = byTestId(canvasElement, `bare-body-${size}`);
      await expect(bareBodyElement).toHaveAttribute('data-part', 'body');
      await expect(bareBodyElement.querySelector('.dx-scroll-root')).toBeNull();

      // Size flows to the toolbar's controls and the body's rails.
      const add = byTestId(canvasElement, `add-${size}`).getBoundingClientRect();
      await expect(add.height, `${size} control`).toBeCloseTo(controlSize(size), 0);
      // The toolbar pads its inline edges by half a gap, then the control sits its inset into its cell.
      const toolbar = byTestId(canvasElement, `add-${size}`).closest<HTMLElement>('.dx-toolbar');
      const toolbarPadding = toolbar ? parseFloat(getComputedStyle(toolbar).paddingLeft) : 0;
      await expect(add.left - rect.left, `${size} control inset`).toBeCloseTo(inset + toolbarPadding, 0);
      const rail = byTestId(canvasElement, `rail-${size}`).getBoundingClientRect();
      await expect(rail.width, `${size} rail block`).toBeCloseTo(block, 0);
      await expect(rail.left, `${size} rail start`).toBeCloseTo(rect.left, 0);
      await expect(byTestId(canvasElement, `text-${size}`).getBoundingClientRect().left).toBeCloseTo(rail.right, 0);
      await expect(byTestId(canvasElement, `row-${size}`).getBoundingClientRect().height).toBeCloseTo(block, 0);

      // A body Container that names no gutter takes the panel's: `sm` by default, at every size; one nested in it
      // inherits; `Panel.Root gutter` changes it.
      const defaultPanel = byTestId(canvasElement, `default-gutter-${size}`).getBoundingClientRect();
      await expect(byTestId(canvasElement, `default-gutter-body-${size}`)).toHaveAttribute('data-gutter', 'sm');
      await expect(byTestId(canvasElement, `default-gutter-nested-${size}`)).toHaveAttribute('data-gutter', 'inherit');
      const defaultText = byTestId(canvasElement, `default-gutter-text-${size}`).getBoundingClientRect();
      await expect(defaultText.left - defaultPanel.left, `${size} default panel gutter`).toBeCloseTo(SM_GUTTER, 0);
      const mdPanel = byTestId(canvasElement, `md-gutter-${size}`).getBoundingClientRect();
      const mdText = byTestId(canvasElement, `md-gutter-text-${size}`).getBoundingClientRect();
      await expect(mdText.left - mdPanel.left, `${size} md panel gutter`).toBeCloseTo(MD_GUTTER, 0);
    }
    await expectScoped(canvasElement);

    // The body scrolls, the thumb in the end gutter following it.
    const frame = byTestId(canvasElement, 'body-md');
    const viewport = frame.querySelector<HTMLElement>(':scope > .dx-scroll-viewport');
    await expect(viewport).not.toBeNull();
    if (!viewport) {
      return;
    }
    await expect(viewport.scrollHeight).toBeGreaterThan(viewport.clientHeight);
    await expect(getComputedStyle(viewport).scrollbarWidth).toBe('none');
    const thumb = await waitFor(() => {
      const element = frame.querySelector<HTMLElement>(':scope > .absolute');
      if (!element) {
        throw new Error('missing thumb');
      }
      return element;
    });
    const top = thumb.getBoundingClientRect().top;
    viewport.scrollTop = viewport.scrollHeight;
    await waitFor(() => expect(thumb.getBoundingClientRect().top).toBeGreaterThan(top));
    const thumbRect = thumb.getBoundingClientRect();
    await expect(thumbRect.right).toBeCloseTo(frame.getBoundingClientRect().right, 0);
    await expect(thumbRect.left, 'thumb in the end gutter').toBeGreaterThanOrEqual(
      frame.getBoundingClientRect().right - GEOMETRY.md.block,
    );

    // Narrowed below the collapse width, the panel collapses the rail gutter to the inset and hides the rails.
    const host = byTestId(canvasElement, 'host-md');
    host.style.width = '16rem';
    try {
      const panel = byTestId(canvasElement, 'panel-md');
      await waitFor(() => expect(getComputedStyle(byTestId(canvasElement, 'rail-md')).display).toBe('none'));
      const text = byTestId(sizeRow(canvasElement, 'md'), 'text-md').getBoundingClientRect();
      await expect(text.left - panel.getBoundingClientRect().left, 'inset gutter').toBeCloseTo(8, 0);
    } finally {
      host.style.width = '';
    }
  },
};
