//
// Copyright 2024 DXOS.org
//

import { useComposedRefs } from '@radix-ui/react-compose-refs';
import { createContext } from '@radix-ui/react-context';
import { Slot } from '@radix-ui/react-slot';
import React, {
  type ComponentPropsWithRef,
  forwardRef,
  type PropsWithChildren,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { type ClassNameValue, type ThemedClassName, useMediaQuery, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { resizeHandle, resizeHandleVertical } from '../../fragments';
import { translationKey } from '../../translations';

const MIN_WIDTH = [20, 'rem'] as const;

// -- Deck Context.
type DeckContextValue = { solo?: boolean };

const [DeckProvider, useDeckContext] = createContext<DeckContextValue>('Deck');

// -- Plank Context.
type DeckPlankUnit = 'rem' | 'px';

type PlankContextValue = {
  unit: DeckPlankUnit;
  size: number;
  setSize: (nextSize: number) => void;
};

const PLANK_NAME = 'DeckPlank';

const [PlankProvider, usePlankContext] = createContext<PlankContextValue>(PLANK_NAME);

type DeckRootProps = ThemedClassName<ComponentPropsWithRef<'div'>> & { asChild?: boolean } & DeckContextValue;

const deckGrid =
  'grid grid-rows-[var(--rail-size)_[toolbar-start]_var(--rail-action)_[content-start]_1fr_[content-end]] grid-cols-[repeat(99,min-content)]';

// TODO(thure): `justify-center` will hide some content if overflowing, nor will something like `dialogLayoutFragment` containing the Deck behave the same way.
//  Currently `justify-center-if-no-scroll` is used, which relies on support for `animation-timeline: scroll(inline self)`, which is not broad.
const deckLayout = `overflow-y-hidden overflow-x-auto snap-inline snap-proximity sm:snap-none sm:justify-center-if-no-scroll ${deckGrid}`;

const soloLayout =
  'grid grid-rows-[var(--rail-size)_[toolbar-start]_var(--rail-action)_[content-start]_1fr_[content-end]] grid-cols-1 overflow-hidden';

const resizeButtonStyles = (...etc: ClassNameValue[]) =>
  mx(resizeHandle, resizeHandleVertical, 'hidden sm:grid row-span-3', ...etc);

const DeckRoot = forwardRef<HTMLDivElement, DeckRootProps>(
  ({ classNames, children, asChild, solo, ...props }, forwardedRef) => {
    const Root = asChild ? Slot : 'div';

    return (
      <DeckProvider solo={solo}>
        <Root {...props} className={mx(solo ? soloLayout : deckLayout, classNames)} ref={forwardedRef}>
          {children}
        </Root>
      </DeckProvider>
    );
  },
);

const defaults = {
  // Min width for TLDraw to show tools (when in stack).
  size: 44,
};

const DeckPlankRoot = ({
  size = defaults.size,
  setSize,
  children,
}: PropsWithChildren<{
  defaultSize?: number;
  size?: number;
  setSize?: (size: number) => void;
}>) => {
  const [internalSize, setInternalSize] = useState(size);

  // Update internal size when external size changes
  useEffect(() => {
    setInternalSize(size);
  }, [size]);

  // Handle size changes
  const handleSetSize = (newSize: number) => {
    setInternalSize(newSize);
    if (setSize) {
      setSize(newSize);
    }
  };

  return (
    <PlankProvider size={internalSize} setSize={handleSetSize} unit='rem'>
      {children}
    </PlankProvider>
  );
};

type DeckPlankProps = ThemedClassName<ComponentPropsWithRef<'article'>> & {
  scrollIntoViewOnMount?: boolean;
  suppressAutofocus?: boolean;
};

type DeckPlankResizing = Pick<MouseEvent, 'pageX'> & { size: number } & { [Unit in DeckPlankUnit]: number };

const DeckPlankContent = forwardRef<HTMLDivElement, DeckPlankProps>(
  ({ classNames, style, children, scrollIntoViewOnMount, suppressAutofocus, ...props }, forwardedRef) => {
    const [isSm] = useMediaQuery('sm', { ssr: false });
    const articleElement = useRef<HTMLDivElement | null>(null);
    const ref = useComposedRefs(articleElement, forwardedRef);
    const { unit = 'rem', size = defaults.size } = usePlankContext('DeckPlankContent');
    const { solo } = useDeckContext('DeckPlankContext');

    const inlineSize = solo ? undefined : isSm ? `${size}${unit}` : '100dvw';

    return (
      <article
        {...props}
        style={{
          inlineSize,
          ...style,
        }}
        className={mx('snap-normal snap-start grid row-span-3 grid-rows-subgrid group', classNames)}
        ref={ref}
        data-testid='deck.plank'
      >
        {children}
      </article>
    );
  },
);

type DeckPlankResizeHandleProps = ThemedClassName<ComponentPropsWithRef<'button'>>;

const DeckPlankResizeHandle = forwardRef<HTMLButtonElement, DeckPlankResizeHandleProps>(
  ({ classNames, ...props }, forwardedRef) => {
    const { t } = useTranslation(translationKey);

    const { unit, size, setSize } = usePlankContext('PlankResizeHandle');
    const [resizing, setResizing] = useState<null | DeckPlankResizing>(null);

    const handlePointerUp = useCallback(({ isPrimary }: PointerEvent) => isPrimary && setResizing(null), []);
    const handlePointerMove = useCallback(
      ({ pageX }: PointerEvent) => {
        if (resizing) {
          const delta = pageX - resizing.pageX;
          setSize(Math.max(MIN_WIDTH[0], resizing.size + delta / resizing[unit]));
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
      <button
        {...props}
        data-resizing={`${!!resizing}`}
        className={resizeButtonStyles(classNames)}
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
        ref={forwardedRef}
      >
        <span className='sr-only'>{t('resize handle label')}</span>
      </button>
    );
  },
);

export { DeckRoot, DeckPlankRoot, DeckPlankContent, DeckPlankResizeHandle, deckGrid, useDeckContext };

export const Deck = {
  Root: DeckRoot,
};

export const Plank = {
  Root: DeckPlankRoot,
  Content: DeckPlankContent,
  ResizeHandle: DeckPlankResizeHandle,
};

export type { DeckPlankProps, DeckPlankUnit, DeckRootProps, DeckPlankResizeHandleProps, PlankContextValue };
