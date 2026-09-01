//
// Copyright 2026 DXOS.org
//

import { type Meta } from '@storybook/react-vite';
import React, { type PropsWithChildren, useLayoutEffect, useRef, useState } from 'react';

import { mx } from './util';

//
// The sizing utilities exist to answer one question: how is this element sized by its parent?
// Each story below pins a parent to a fixed 260px box and puts a 900px-tall child inside, so an
// element that fails to constrain is immediately visible as a blown-out box.
//

const PARENT_SIZE = 260;
const TALL = 900;

/**
 * Reports the element's used height, so a story shows the measured outcome rather than asking the
 * reader to eyeball it.
 */
const Measured = ({ label, classNames, children }: PropsWithChildren<{ label: string; classNames: string }>) => {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>();
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    const observer = new ResizeObserver(() => setHeight(Math.round(el.getBoundingClientRect().height)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const constrained = height !== undefined && height <= PARENT_SIZE;
  return (
    <div ref={ref} className={mx('relative bg-primary-500/10 border border-primary-500/40', classNames)}>
      <div className='sticky top-0 flex justify-between px-2 py-1 text-xs bg-base-surface'>
        <span className='font-mono'>{label}</span>
        <span className={mx('font-mono', constrained ? 'text-emerald-500' : 'text-rose-500')}>
          {height === undefined ? '—' : `${height}px`}
        </span>
      </div>
      {children}
    </div>
  );
};

const Tall = () => (
  <div style={{ height: TALL }} className='bg-primary-500/20 p-2 text-xs'>
    900px of content
  </div>
);

const Frame = ({ title, note, children }: PropsWithChildren<{ title: string; note?: string }>) => (
  <div className='flex flex-col gap-1'>
    <div className='text-sm font-medium'>{title}</div>
    {note && <div className='text-xs text-description'>{note}</div>}
    {/*
      The clip belongs here, on the frame, and never on the measured element: a non-visible
      overflow zeroes an item's own automatic minimum size, so clipping the subject would
      constrain every variant and the story would demonstrate nothing.
    */}
    <div className='border border-separator overflow-hidden' style={{ height: PARENT_SIZE, width: 220 }}>
      {children}
    </div>
  </div>
);

const meta = {
  title: 'ui/ui-theme/Sizing',
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

/**
 * The same class behaves differently depending on the parent's formatting context. Only the
 * applicable property is consulted; the rest are inert rather than wrong.
 */
export const ParentTypes = {
  render: () => (
    <div className='p-4 flex flex-col gap-6'>
      <p className='max-w-2xl text-sm text-description'>
        Each parent is 260px tall with a 40px header and a 900px child. Green means the element stayed inside its
        parent; red means it grew to its content and blew the box out.
      </p>
      <div className='flex flex-wrap gap-6'>
        <Frame title='flex parent' note='flex-1 sizes it; min-h-0 lets it shrink'>
          <div className='flex flex-col h-full'>
            <div className='h-10 shrink-0 bg-neutral-500/20 p-2 text-xs'>header</div>
            <Measured label='dx-expand' classNames='dx-expand'>
              <Tall />
            </Measured>
          </div>
        </Frame>

        <Frame title='grid parent' note='flex-1 is ignored; min-h-0 does all the work'>
          <div className='grid grid-rows-[auto_1fr] h-full'>
            <div className='h-10 bg-neutral-500/20 p-2 text-xs'>header</div>
            <Measured label='dx-expand' classNames='dx-expand'>
              <Tall />
            </Measured>
          </div>
        </Frame>

        <Frame title='block parent' note='h-full is the only live property'>
          <div className='h-full'>
            <Measured label='dx-fill' classNames='dx-fill'>
              <Tall />
            </Measured>
          </div>
        </Frame>
      </div>
    </div>
  ),
};

/**
 * Isolates which single property constrains a grid item. `flex-1` and `h-full` are both inert
 * here — only `min-h-0` prevents the automatic minimum size from growing the track.
 */
export const WhichPropertyFires = {
  render: () => (
    <div className='p-4 flex flex-col gap-6'>
      <p className='max-w-2xl text-sm text-description'>
        Identical grid parents, varying only the child. This is why `dx-expand` works without the author knowing the
        parent's display type — and why `flex-1` next to `grid` is not a bug.
      </p>
      <div className='flex flex-wrap gap-6'>
        {[
          { label: 'nothing', cls: '' },
          { label: 'flex-1', cls: 'flex-1' },
          { label: 'h-full', cls: 'h-full' },
          { label: 'min-h-0', cls: 'min-h-0' },
          { label: 'dx-grow', cls: 'dx-grow' },
          { label: 'dx-expand', cls: 'dx-expand' },
        ].map(({ label, cls }) => (
          <Frame key={label} title={label}>
            <div className='grid grid-rows-[auto_1fr] h-full'>
              <div className='h-10 bg-neutral-500/20 p-2 text-xs'>header</div>
              <Measured label={label || '(none)'} classNames={cls}>
                <Tall />
              </Measured>
            </div>
          </Frame>
        ))}
      </div>
    </div>
  ),
};

/**
 * What `min-*-0` actually does — the class this vocabulary exists to demystify.
 *
 * It is read as "makes things scroll". It does not: it says the element MAY BE SHORTER THAN ITS
 * CONTENT. Without it, an item's minimum height is its content height, so it shoves its siblings
 * out of the line. Scrolling is only the downstream consequence of finally being squeezed.
 */
export const ShrinkingVersusShoving = {
  render: () => {
    const footer = <div className='h-10 shrink-0 grid place-items-center text-xs bg-emerald-500/20'>footer</div>;
    return (
      <div className='p-4 flex flex-col gap-6'>
        <p className='max-w-2xl text-sm text-description'>
          Identical 260px columns: a body holding 900px of content, then a 40px footer. Watch the footer, not the
          scrollbar — the failure on the left is a displaced sibling, and nothing scrolls in either box.
        </p>
        <div className='flex flex-wrap gap-6'>
          <Frame title='no dx-shrink' note='body claims its content height; footer is pushed out of view'>
            <div className='flex flex-col h-full'>
              <Measured label='(nothing)' classNames=''>
                <Tall />
              </Measured>
              {footer}
            </div>
          </Frame>
          <Frame title='dx-shrink' note='body yields; footer keeps its place'>
            <div className='flex flex-col h-full'>
              <Measured label='dx-shrink' classNames='dx-shrink'>
                <Tall />
              </Measured>
              {footer}
            </div>
          </Frame>
          {/* The point most likely to save someone an afternoon: a clip says the same thing, so a
              `min-*-0` beside one is dead weight that reads as though it were holding the layout up. */}
          <Frame title='overflow-hidden alone' note='a clip zeroes the same minimum — dx-shrink adds nothing here'>
            <div className='flex flex-col h-full'>
              <Measured label='overflow-hidden' classNames='overflow-hidden'>
                <Tall />
              </Measured>
              {footer}
            </div>
          </Frame>
        </div>
      </div>
    );
  },
};

/**
 * `dx-grow` constrains without clipping, so an overflowing child is visible rather than hidden.
 * Reach for `overflow-hidden` only where a clip is wanted — it also makes the element a scroll
 * container, which a focused descendant can silently scroll.
 */
export const ClippingIsSeparate = {
  render: () => (
    <div className='p-4 flex flex-col gap-6'>
      <p className='max-w-2xl text-sm text-description'>
        Both boxes are constrained to 260px. Only the second one clips — the constraint and the clip are independent
        decisions.
      </p>
      <div className='flex flex-wrap gap-6'>
        <Frame title='dx-grow' note='constrained, content spills'>
          <div className='flex flex-col h-full'>
            <Measured label='dx-grow' classNames='dx-grow'>
              <Tall />
            </Measured>
          </div>
        </Frame>
        <Frame title='dx-grow overflow-hidden' note='constrained and clipped'>
          <div className='flex flex-col h-full'>
            <Measured label='dx-grow overflow-hidden' classNames='dx-grow overflow-hidden'>
              <Tall />
            </Measured>
          </div>
        </Frame>
      </div>
    </div>
  ),
};

/**
 * `dx-fullscreen` pins all four edges, which already determines the box — stacking a sizing
 * utility on top of it adds nothing.
 */
export const Fullscreen = {
  render: () => (
    <div className='p-4 flex flex-col gap-6'>
      <p className='max-w-2xl text-sm text-description'>
        Use `dx-fullscreen` instead of `dx-expand`, not alongside it.
      </p>
      <Frame title='dx-fullscreen' note='dx-fullscreen against a positioned ancestor'>
        <div className='relative h-full'>
          <Measured label='dx-fullscreen' classNames='dx-fullscreen'>
            <Tall />
          </Measured>
        </div>
      </Frame>
    </div>
  ),
};
