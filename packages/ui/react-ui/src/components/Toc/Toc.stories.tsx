//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useRef } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { random } from '@dxos/random';

import { withLayout, withTheme } from '../../testing';
import { ScrollArea } from '../ScrollArea';
import { Toc, type TocItemData, type TocRootProps } from './Toc';

random.seed(1234567890);

/** A heading with the text its link shows; the machine needs only `value` and `depth`. */
type Heading = TocItemData & { label: string; paragraphs: string[] };

const SECTIONS = 8;

/**
 * Eight `h2` sections of three `h3` subsections each (`section-1`, `section-1-a`, …), each subsection
 * with its body text drawn once here, so a re-render never regenerates it.
 */
const headings: Heading[] = Array.from({ length: SECTIONS }, (_, index) => index + 1).flatMap((section) => [
  { value: `section-${section}`, depth: 2, label: `Section ${section}`, paragraphs: [] },
  ...['a', 'b', 'c'].map((sub) => ({
    value: `section-${section}-${sub}`,
    depth: 3,
    label: `Section ${section}.${sub}`,
    paragraphs: Array.from({ length: 3 }, () => random.lorem.paragraphs(3)),
  })),
]);

/** The document: each heading carries the id its item names. Nothing in it changes after mount. */
const Document = () => (
  <Toc.Content classNames='flex flex-col gap-3 p-6 max-w-prose'>
    {headings.map(({ value, depth, label, paragraphs }) =>
      depth === 2 ? (
        <h2 key={value} id={value} className='pt-6 text-xl font-medium'>
          {label}
        </h2>
      ) : (
        <React.Fragment key={value}>
          <h3 id={value} className='pt-3 text-base font-medium'>
            {label}
          </h3>
          {paragraphs.map((text, index) => (
            <p key={index} className='text-description'>
              {text}
            </p>
          ))}
        </React.Fragment>
      ),
    )}
  </Toc.Content>
);

type StoryArgs = Pick<TocRootProps, 'rootMargin' | 'autoScroll' | 'scrollBehavior'>;

/** The document scrolls in its own viewport (`scrollEl`), the nav in another beside it. */
const DefaultStory = ({ rootMargin, autoScroll, scrollBehavior }: StoryArgs) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollEl = useCallback(() => scrollRef.current, []);
  return (
    <Toc.Root
      items={headings}
      scrollEl={scrollEl}
      rootMargin={rootMargin}
      autoScroll={autoScroll}
      scrollBehavior={scrollBehavior}
      classNames='grid grid-cols-[1fr_14rem] dx-fill'
    >
      <ScrollArea.Root>
        <ScrollArea.Viewport ref={scrollRef} classNames='dx-document' data-testid='toc.scroll'>
          <Document />
        </ScrollArea.Viewport>
      </ScrollArea.Root>
      <Toc.Nav classNames='dx-fill border p-3'>
        <ScrollArea.Root>
          <Toc.Title>On this page</Toc.Title>
          <ScrollArea.Viewport>
            <Toc.List>
              <Toc.Indicator />
              {headings.map((heading) => (
                <Toc.Item key={heading.value} item={heading}>
                  <Toc.Link href={`#${heading.value}`}>{heading.label}</Toc.Link>
                </Toc.Item>
              ))}
            </Toc.List>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Toc.Nav>
    </Toc.Root>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/Toc',
  render: DefaultStory,
  argTypes: {
    autoScroll: { control: 'boolean' },
    scrollBehavior: { control: 'select', options: ['auto', 'smooth', 'instant'] },
  },
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

const query = (canvasElement: HTMLElement, selector: string) => {
  const element = canvasElement.querySelector<HTMLElement>(selector);
  if (!element) {
    throw new Error(`Not rendered: ${selector}`);
  }
  return element;
};

const linkOf = (canvasElement: HTMLElement, value: string) =>
  waitFor(() => query(canvasElement, `[data-part="link"][data-value="${value}"]`));

const activeValues = (canvasElement: HTMLElement) =>
  [...canvasElement.querySelectorAll<HTMLElement>('[data-part="link"][data-active]')].map(
    (element) => element.dataset.value,
  );

/** Scrolling the document to a heading marks its link and moves the indicator to it. */
export const TestScroll: Story = {
  args: { scrollBehavior: 'instant' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const scroll = canvas.getByTestId('toc.scroll');
    const link = await linkOf(canvasElement, 'section-5-b');
    // Only the headings at the top are in view on first paint.
    await waitFor(() => expect(activeValues(canvasElement)[0]).toBe('section-1'));
    await expect(link).not.toHaveAttribute('data-active');

    const heading = query(canvasElement, '#section-5-b');
    scroll.scrollTop = heading.offsetTop - scroll.offsetTop;
    await waitFor(() => expect(link).toHaveAttribute('data-active'));
    await expect(link).toHaveAttribute('aria-current', 'location');
    await expect(activeValues(canvasElement)).not.toContain('section-1');

    // The indicator spans the active items, measured against the list.
    const indicator = query(canvasElement, '[data-part="indicator"]');
    const list = query(canvasElement, '[data-part="list"]');
    await waitFor(() => expect(indicator).not.toHaveAttribute('hidden'));
    const active = canvasElement.querySelectorAll<HTMLElement>('[data-part="item"][data-active]');
    const first = active[0].getBoundingClientRect();
    const last = active[active.length - 1].getBoundingClientRect();
    await waitFor(async () => {
      const rect = indicator.getBoundingClientRect();
      await expect(Math.abs(rect.top - first.top)).toBeLessThanOrEqual(1);
      await expect(Math.abs(rect.bottom - last.bottom)).toBeLessThanOrEqual(1);
    });
    await expect(list.contains(indicator)).toBe(true);
  },
};

/** Clicking a link scrolls the container to its heading (no page jump) and activates it. */
export const TestClick: Story = {
  args: { scrollBehavior: 'instant' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const scroll = canvas.getByTestId('toc.scroll');
    const link = await linkOf(canvasElement, 'section-7');
    await expect(scroll.scrollTop).toBe(0);
    await userEvent.click(link);
    await waitFor(() => expect(scroll.scrollTop).toBeGreaterThan(0));
    await waitFor(() => expect(link).toHaveAttribute('data-active'));
    const heading = query(canvasElement, '#section-7');
    // The heading lands at the container's top edge.
    const offset = heading.getBoundingClientRect().top - scroll.getBoundingClientRect().top;
    await expect(Math.abs(offset)).toBeLessThanOrEqual(2);
  },
};
