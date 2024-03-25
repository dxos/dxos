//
// Copyright 2024 DXOS.org
//

import React, { Children, type ComponentPropsWithRef, forwardRef, useCallback, useEffect, useState } from 'react';

import { Button, Main, type MainProps, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { translationKey } from '../../translations';

type DeckRootProps = MainProps;

const deckLayout = 'fixed inset-0 z-0 overflow-x-auto overflow-y-hidden snap-proximity snap-inline grid grid-rows-1';

const DeckRoot = forwardRef<HTMLDivElement, DeckRootProps>(
  ({ classNames, style, children, ...props }, forwardedRef) => {
    return (
      <Main.Content
        {...props}
        style={{ gridTemplateColumns: `repeat(${Children.count(children)},min-content)`, ...style }}
        classNames={[deckLayout, classNames]}
        ref={forwardedRef}
      >
        {children}
      </Main.Content>
    );
  },
);
type DeckColumnUnit = 'rem' | 'px';

type DeckColumnProps = ThemedClassName<ComponentPropsWithRef<'article'>> & { unit?: DeckColumnUnit };

type DeckColumnResizing = Pick<MouseEvent, 'pageX'> & { size: number } & { [Unit in DeckColumnUnit]: number };

const DeckColumn = forwardRef<HTMLDivElement, DeckColumnProps>(
  ({ unit = 'rem', classNames, style, children, ...props }, forwardedRef) => {
    const { t } = useTranslation(translationKey);

    const [size, setSize] = useState<number>(20);
    const [resizing, setResizing] = useState<null | DeckColumnResizing>(null);

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
      <article
        {...props}
        style={{ inlineSize: `${size}${unit}`, ...style }}
        className={mx('relative', classNames)}
        ref={forwardedRef}
      >
        {children}
        <Button
          classNames='absolute inline-end-0 inset-block-2 is-2 touch-none'
          onPointerDown={({ isPrimary, pageX }) => {
            if (isPrimary) {
              const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
              setResizing({ pageX, size, rem, px: 1 });
            }
          }}
        >
          <span className='sr-only'>{t('resize handle label')}</span>
        </Button>
      </article>
    );
  },
);

export { DeckRoot, DeckColumn };
