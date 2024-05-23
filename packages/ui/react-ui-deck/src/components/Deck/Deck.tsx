//
// Copyright 2024 DXOS.org
//

import { useFocusFinders } from '@fluentui/react-tabster';
import { useComposedRefs } from '@radix-ui/react-compose-refs';
import { Slot } from '@radix-ui/react-slot';
import React, { type ComponentPropsWithRef, forwardRef, useCallback, useEffect, useRef, useState } from 'react';

import { type ThemedClassName, useMediaQuery, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { resizeHandle, resizeHandleVertical } from '../../fragments';
import { translationKey } from '../../translations';

type DeckRootProps = ThemedClassName<ComponentPropsWithRef<'div'>> & { asChild?: boolean };

const deckGrid =
  'grid grid-rows-[var(--rail-size)_[toolbar-start]_var(--rail-action)_[content-start]_1fr_[content-end]] grid-cols-[repeat(99,min-content)]';

// TODO(thure): `justify-center` will hide some content if overflowing, nor will something like `dialogLayoutFragment` containing the Deck behave the same way. Currently `justify-center-if-no-scroll` is used, which relies on support for `animation-timeline: scroll(inline self)`, which is not broad.
const deckLayout =
  'overflow-x-auto overflow-y-hidden snap-inline snap-proximity sm:snap-none sm:justify-center-if-no-scroll ' +
  deckGrid;

const resizeButtonStyles = mx(resizeHandle, resizeHandleVertical, 'hidden sm:grid row-span-3');

const DeckRoot = forwardRef<HTMLDivElement, DeckRootProps>(
  ({ classNames, children, asChild, ...props }, forwardedRef) => {
    const Root = asChild ? Slot : 'div';
    return (
      <Root {...props} className={mx(deckLayout, classNames)} ref={forwardedRef}>
        {children}
      </Root>
    );
  },
);

type DeckPlankUnit = 'rem' | 'px';

type DeckPlankProps = ThemedClassName<ComponentPropsWithRef<'article'>> & {
  unit?: DeckPlankUnit;
  scrollIntoViewOnMount?: boolean;
  suppressAutofocus?: boolean;
};

type DeckPlankResizing = Pick<MouseEvent, 'pageX'> & { size: number } & { [Unit in DeckPlankUnit]: number };

const DeckPlank = forwardRef<HTMLDivElement, DeckPlankProps>(
  ({ unit = 'rem', classNames, style, children, scrollIntoViewOnMount, suppressAutofocus, ...props }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    const [isSm] = useMediaQuery('sm', { ssr: false });

    const [size, setSize] = useState<number>(40);
    const [resizing, setResizing] = useState<null | DeckPlankResizing>(null);
    const articleElement = useRef<HTMLDivElement | null>(null);
    const ref = useComposedRefs(articleElement, forwardedRef);
    const { findFirstFocusable } = useFocusFinders();

    const handlePointerUp = useCallback(({ isPrimary }: PointerEvent) => isPrimary && setResizing(null), []);
    const handlePointerMove = useCallback(
      ({ pageX }: PointerEvent) => {
        if (resizing) {
          const delta = pageX - resizing.pageX;
          setSize(resizing.size + delta / resizing[unit]);
        }
      },
      [resizing],
    );

    useEffect(() => {
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointermove', handlePointerMove);
      // NOTE(thure): This sets the column resize cursor on body temporarily for when the cursor leaves the button
      //   momentarily between layout repaints.
      document.body.classList[resizing ? 'add' : 'remove']('cursor-col-resize');
      return () => {
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointermove', handlePointerMove);
        document.body.classList.remove('cursor-col-resize');
      };
    }, [handlePointerUp, handlePointerMove, resizing]);

    useEffect(() => {
      if (scrollIntoViewOnMount) {
        articleElement.current?.scrollIntoView({ inline: 'center', behavior: 'smooth' });
        !suppressAutofocus && articleElement.current && findFirstFocusable(articleElement.current)?.focus();
      }
    }, [scrollIntoViewOnMount]);

    return (
      <>
        <article
          {...props}
          style={{ inlineSize: isSm ? `${size}${unit}` : '100dvw', ...style }}
          className={mx('snap-normal snap-start grid row-span-3 grid-rows-subgrid group', classNames)}
          ref={ref}
        >
          {children}
        </article>
        <button
          data-resizing={`${!!resizing}`}
          className={resizeButtonStyles}
          onPointerDown={({ isPrimary, pageX }) => {
            if (isPrimary) {
              const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
              setResizing({ pageX, size, rem, px: 1 });
            }
          }}
          onKeyDown={(event) => {
            switch (event.key) {
              case 'ArrowLeft':
                event.preventDefault();
                return setSize(size - (unit === 'px' ? 10 : 1));
              case 'ArrowRight':
                event.preventDefault();
                return setSize(size + (unit === 'px' ? 10 : 1));
            }
          }}
        >
          <span className='sr-only'>{t('resize handle label')}</span>
        </button>
      </>
    );
  },
);

export { DeckRoot, DeckPlank, deckGrid };

export const Deck = {
  Root: DeckRoot,
  Plank: DeckPlank,
};

export type { DeckPlankProps, DeckPlankUnit, DeckRootProps };
