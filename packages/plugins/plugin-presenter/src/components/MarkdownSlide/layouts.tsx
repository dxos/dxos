//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, type ReactNode, createContext, useContext } from 'react';

import { mx } from '@dxos/ui-theme';

import { type LayoutName, type SlideFrontmatter, type SlotName } from '#markdown';

import { imageStyle } from './SlideBackground.tsx';
import { theme } from './theme.ts';

export type LayoutProps = {
  slots: Record<SlotName, ReactNode>;
  frontmatter: SlideFrontmatter;
};

export type Layout = (props: LayoutProps) => ReactNode;

type FrameProps = PropsWithChildren<{ name: LayoutName; className?: string }>;

const Frame = ({ name, className, children }: FrameProps) => (
  <div data-layout={name} className={mx('relative size-full', className)}>
    {children}
  </div>
);

type SlotProps = PropsWithChildren<{ name: SlotName; className?: string }>;

/** The slot to outline (the editor's cursor slot); only layouts with more than one slot outline it. */
export const ActiveSlotContext = createContext<SlotName | undefined>(undefined);

const Slot = ({ name, className, children }: SlotProps) => {
  const active = useContext(ActiveSlotContext) === name;
  return (
    <div
      data-slot={name}
      data-active={active || undefined}
      className={mx(
        'flex flex-col gap-8 min-w-0 min-h-0',
        active && 'outline-dashed outline-4 outline-offset-[16px] outline-focus',
        className,
      )}
    >
      {children}
    </div>
  );
};

const ImagePane = ({ frontmatter }: { frontmatter: SlideFrontmatter }) => (
  <div data-image className='size-full' style={imageStyle(frontmatter.image, frontmatter.backgroundPosition)} />
);

// Larger headings for layouts that carry a single statement.
const emphasis = '[&_h1]:text-[160px] [&_h1]:leading-tight [&_h2]:text-[96px]';

const centered = ({ name, className }: { name: LayoutName; className?: string }): Layout => {
  const CenteredLayout = ({ slots }: LayoutProps) => (
    <Frame name={name} className={mx('grid place-content-center text-center', theme.padding, className)}>
      <Slot name='default' className='items-center'>
        {slots.default}
      </Slot>
    </Frame>
  );
  return CenteredLayout;
};

const vertical = ({ name, className }: { name: LayoutName; className?: string }): Layout => {
  const VerticalLayout = ({ slots }: LayoutProps) => (
    <Frame name={name} className={mx('flex flex-col justify-center', theme.padding, className)}>
      <Slot name='default'>{slots.default}</Slot>
    </Frame>
  );
  return VerticalLayout;
};

const DefaultLayout = ({ slots }: LayoutProps) => (
  <Frame name='default' className={mx('flex flex-col', theme.padding)}>
    <Slot name='default' className='grow'>
      {slots.default}
    </Slot>
  </Frame>
);

// With `bleed:`, padding moves from the frame to the columns, and the column on the bleeding side keeps none.
const columns = (bleed: SlideFrontmatter['bleed']) => ({
  frame: bleed ? undefined : theme.padding,
  left: bleed === 'left' ? undefined : bleed ? 'pl-40 py-16' : undefined,
  middle: bleed ? 'py-16' : undefined,
  right: bleed === 'right' ? undefined : bleed ? 'pr-40 py-16' : undefined,
});

const TwoColsLayout = ({ slots, frontmatter }: LayoutProps) => {
  const padding = columns(frontmatter.bleed);
  return (
    <Frame name='two-cols' className={mx('grid grid-cols-2 gap-16', padding.frame)}>
      <Slot name='default' className={padding.left}>
        {slots.default}
        {slots.left}
      </Slot>
      <Slot name='right' className={padding.right}>
        {slots.right}
      </Slot>
    </Frame>
  );
};

const TwoColsHeaderLayout = ({ slots }: LayoutProps) => (
  <Frame name='two-cols-header' className={mx('grid grid-cols-2 grid-rows-[auto_1fr] gap-x-16 gap-y-8', theme.padding)}>
    <Slot name='default' className='col-span-2'>
      {slots.default}
    </Slot>
    <Slot name='left'>{slots.left}</Slot>
    <Slot name='right'>{slots.right}</Slot>
  </Frame>
);

const ThreeColsLayout = ({ slots, frontmatter }: LayoutProps) => {
  const padding = columns(frontmatter.bleed);
  return (
    <Frame name='three-cols' className={mx('grid grid-cols-3 gap-16', padding.frame)}>
      <Slot name='default' className={padding.left}>
        {slots.default}
        {slots.left}
      </Slot>
      <Slot name='middle' className={padding.middle}>
        {slots.middle}
      </Slot>
      <Slot name='right' className={padding.right}>
        {slots.right}
      </Slot>
    </Frame>
  );
};

const TwoByTwoLayout = ({ slots }: LayoutProps) => (
  <Frame name='two-by-two' className={mx('grid grid-cols-2 grid-rows-2 gap-x-16 gap-y-12', theme.padding)}>
    <Slot name='default'>
      {slots.default}
      {slots.left}
    </Slot>
    <Slot name='right'>{slots.right}</Slot>
    <Slot name='bottom-left'>{slots['bottom-left']}</Slot>
    <Slot name='bottom-right'>{slots['bottom-right']}</Slot>
  </Frame>
);

// The picture itself is painted by `SlideBackground`; a scrim keeps any content on top of it readable.
const ImageLayout = ({ slots }: LayoutProps) => (
  <Frame name='image' className={mx('flex flex-col', theme.padding)}>
    {slots.default && <div data-scrim aria-hidden className='dx-cover pointer-events-none bg-scrim-surface' />}
    {/* Grows, so an embedded object with no height of its own fills the slide below the text. */}
    <Slot name='default' className='relative grow'>
      {slots.default}
    </Slot>
  </Frame>
);

const ImageLeftLayout = ({ slots, frontmatter }: LayoutProps) => (
  <Frame name='image-left' className='grid grid-cols-2'>
    <ImagePane frontmatter={frontmatter} />
    <Slot name='default' className={mx('justify-center', theme.padding)}>
      {slots.default}
    </Slot>
  </Frame>
);

const ImageRightLayout = ({ slots, frontmatter }: LayoutProps) => (
  <Frame name='image-right' className='grid grid-cols-2'>
    <Slot name='default' className={mx('justify-center', theme.padding)}>
      {slots.default}
    </Slot>
    <ImagePane frontmatter={frontmatter} />
  </Frame>
);

const FullLayout = ({ slots }: LayoutProps) => (
  <Frame name='full'>
    <Slot name='default' className='size-full'>
      {slots.default}
    </Slot>
  </Frame>
);

const NoneLayout = ({ slots }: LayoutProps) => (
  <Frame name='none'>
    <div data-slot='default' className='contents'>
      {slots.default}
    </div>
  </Frame>
);

/** One component per Slidev built-in layout, with the same names and slots, plus `three-cols` and `two-by-two`. */
export const layouts: Record<LayoutName, Layout> = {
  'default': DefaultLayout,
  'cover': vertical({ name: 'cover', className: emphasis }),
  'center': centered({ name: 'center' }),
  'section': vertical({ name: 'section', className: emphasis }),
  'intro': vertical({ name: 'intro' }),
  'end': centered({ name: 'end', className: 'uppercase tracking-widest' }),
  'fact': centered({ name: 'fact', className: emphasis }),
  'statement': centered({ name: 'statement', className: emphasis }),
  'quote': vertical({ name: 'quote', className: '[&_blockquote]:text-[72px]' }),
  'two-cols': TwoColsLayout,
  'two-cols-header': TwoColsHeaderLayout,
  'three-cols': ThreeColsLayout,
  'two-by-two': TwoByTwoLayout,
  'image': ImageLayout,
  'image-left': ImageLeftLayout,
  'image-right': ImageRightLayout,
  'full': FullLayout,
  'none': NoneLayout,
};
