//
// Copyright 2026 DXOS.org
//

import { ark } from '@ark-ui/react/factory';
import React, { type CSSProperties, type PropsWithChildren } from 'react';

import { type SlottableProps } from '@dxos/ui-types';

import { useIconHref } from '../hooks/index.ts';
import { composableProps, slottable } from '../util/index.ts';
import { type Size, metrics } from './sizes.ts';

export namespace Next {
  export type ContainerProps = SlottableProps<{ size?: Size }>;

  /** Sets the size's metrics as CSS variables for everything inside; `asChild` puts them on its child instead. */
  export const Container = slottable<HTMLDivElement, ContainerProps>(
    ({ children, asChild, size = 'md', ...props }, forwardedRef) => {
      const { blockSize, lineHeight, fontSize, iconSize, gapSize } = metrics[size];
      // Defaults rather than overrides, so a caller's own `style` still wins.
      const { className, ...rest } = composableProps(props, {
        style: {
          '--block-size': blockSize,
          '--line-height': lineHeight,
          '--font-size': fontSize,
          '--icon-size': iconSize,
          '--gap-size': gapSize,
        } as CSSProperties,
      });
      return (
        <ark.div asChild={asChild} {...rest} className={className} ref={forwardedRef}>
          {children}
        </ark.div>
      );
    },
  );

  export const Toolbar = ({ children, size = 'md' }: PropsWithChildren<{ size?: Size }>) => {
    return (
      <Container size={size} asChild>
        <div className='shrink-0 w-full flex items-center overflow-x-auto scrollbar-none'>{children}</div>
      </Container>
    );
  };

  export const Block = ({ children }: PropsWithChildren) => {
    return <div className='shrink-0 grid place-items-center w-(--block-size) h-(--block-size)'>{children}</div>;
  };

  export const Icon = ({ icon }: { icon: string }) => {
    const href = useIconHref(icon);
    return (
      <svg className='w-(--icon-size,1.5rem) h-(--icon-size,1.5rem)'>
        <use href={href} />
      </svg>
    );
  };

  // TODO(burdon): Implement geometry (padding).
  export const Input = () => {
    return (
      <input
        type='text'
        placeholder='Input'
        className={[
          'w-full px-(--gap-size) py-0',
          'text-[length:var(--font-size,1rem)] leading-(--line-height)',
          'bg-base-surface border-none dx-focus-ring-inset',
        ].join(' ')}
      />
    );
  };

  // TODO(burdon): Implement geometry (padding).
  export const Button = ({ children }: PropsWithChildren) => {
    return (
      <button
        className={[
          'w-fit px-(--gap-size) py-0',
          'text-[length:var(--font-size,1rem)] leading-(--line-height)',
          'bg-base-surface hover:bg-hover-surface border-none dx-focus-ring-inset',
        ].join(' ')}
      >
        {children}
      </button>
    );
  };

  export const Typography = ({ children }: PropsWithChildren) => {
    return <span className='text-[length:var(--font-size,1rem)]'>{children}</span>;
  };
}
