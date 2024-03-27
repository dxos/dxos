//
// Copyright 2024 DXOS.org
//

import React, { Children, type ComponentPropsWithRef, forwardRef, useCallback, useEffect, useState } from 'react';

import { Button, Main, type MainProps, type ThemedClassName, useMediaQuery, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { translationKey } from '../../translations';

type DeckRootProps = MainProps;

const deckLayout = 'fixed inset-0 z-0 overflow-x-auto overflow-y-hidden snap-proximity snap-inline grid grid-rows-1';

const DeckRoot = forwardRef<HTMLDivElement, DeckRootProps>(
  ({ classNames, style, children, ...props }, forwardedRef) => {
    return (
      <Main.Content
        {...props}
        style={{ gridTemplateColumns: `repeat(${Children.count(children) * 2},min-content)`, ...style }}
        classNames={[deckLayout, classNames]}
        ref={forwardedRef}
      >
        {children}
      </Main.Content>
    );
  },
);

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
      return () => {
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointermove', handlePointerMove);
      };
    }, [handlePointerUp, handlePointerMove]);

    return (
      <>
        <article
          {...props}
          style={{ inlineSize: isSm ? `${size}${unit}` : '100dvw', ...style }}
          className={mx('snap-always snap-start overflow-y-auto', classNames)}
          ref={forwardedRef}
        >
          {children}
        </article>
        <Button
          variant='default'
          classNames='hidden sm:block is-4 pointer-fine:is-2 m-1 p-0 !rounded-full touch-none snap-normal snap-end'
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
        </Button>
      </>
    );
  },
);

export { DeckRoot, DeckPlank };

export const Deck = {
  Root: DeckRoot,
  Plank: DeckPlank,
};

export type { DeckPlankProps, DeckPlankUnit, DeckRootProps };
