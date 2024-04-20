//
// Copyright 2024 DXOS.org
//

import React, { type ComponentPropsWithRef, forwardRef, useCallback, useEffect, useState } from 'react';

import { Main, type MainProps, type ThemedClassName, useMediaQuery, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { resizeHandle, resizeHandleVertical } from '../../fragments';
import { translationKey } from '../../translations';

type DeckRootProps = MainProps;

const deckGrid =
  'grid grid-rows-[var(--rail-size)_[toolbar-start]_var(--rail-action)_[content-start]_1fr_[content-end]] grid-cols-[repeat(99,min-content)]';

// TODO(thure): `justify-center` will hide some content if overflowing, nor will something like `dialogLayoutFragment` containing the Deck behave the same way. Currently `justify-center-if-no-scroll` is used, which relies on support for `animation-timeline: scroll(inline self)`, which is not broad.
const deckLayout =
  'fixed inset-0 z-0 overflow-x-auto overflow-y-hidden snap-inline snap-proximity justify-center-if-no-scroll ' +
  deckGrid;

const resizeButtonStyles = mx(resizeHandle, resizeHandleVertical, 'hidden sm:grid row-span-3');

const DeckRoot = forwardRef<HTMLDivElement, DeckRootProps>(({ classNames, children, ...props }, forwardedRef) => {
  return (
    <Main.Content {...props} classNames={[deckLayout, classNames]} ref={forwardedRef}>
      {children}
    </Main.Content>
  );
});

type DeckPlankUnit = 'rem' | 'px';

type DeckPlankProps = ThemedClassName<ComponentPropsWithRef<'article'>> & { unit?: DeckPlankUnit };

type DeckPlankResizing = Pick<MouseEvent, 'pageX'> & { size: number } & { [Unit in DeckPlankUnit]: number };

const DeckPlank = forwardRef<HTMLDivElement, DeckPlankProps>(
  ({ unit = 'rem', classNames, style, children, ...props }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    const [isSm] = useMediaQuery('sm', { ssr: false });

    const [size, setSize] = useState<number>(40);
    const [resizing, setResizing] = useState<null | DeckPlankResizing>(null);

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

    return (
      <>
        <article
          {...props}
          style={{ inlineSize: isSm ? `${size}${unit}` : '100dvw', ...style }}
          className={mx('snap-always snap-start grid row-span-3 grid-rows-subgrid group', classNames)}
          ref={forwardedRef}
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
