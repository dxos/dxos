//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, createContext, useContext, useMemo } from 'react';

import type * as SlideFooter from '../../SlideFooter.ts';

/**
 * Where a slide stands in the deck that draws it: its number among the slides the deck presents (1-based), and how
 * many of those there are. Either is absent where there is none to give: a slide drawn outside a deck has neither,
 * and a slide the deck leaves out when presented has no number.
 */
export type SlidePosition = { current?: number; total?: number };

const SlidePositionContext = createContext<SlidePosition>({});

export type SlidePositionProviderProps = PropsWithChildren<SlidePosition>;

/** Gives the slide drawn below it its place in the deck, which `<SlideCurrentNo />` and `<SlidesTotal />` read. */
export const SlidePositionProvider = ({ current, total, children }: SlidePositionProviderProps) => {
  const position = useMemo(() => ({ current, total }), [current, total]);
  return <SlidePositionContext.Provider value={position}>{children}</SlidePositionContext.Provider>;
};

/** The place in its deck of the slide being drawn; empty outside a deck. */
export const useSlidePosition = (): SlidePosition => useContext(SlidePositionContext);

const SlideFooterContext = createContext<SlideFooter.Settings | undefined>(undefined);

export type SlideFooterProviderProps = PropsWithChildren<{ settings?: SlideFooter.Settings }>;

/** Sets the footer of every slide drawn below it; with no settings, those slides draw none. */
export const SlideFooterProvider = ({ settings, children }: SlideFooterProviderProps) => (
  <SlideFooterContext.Provider value={settings}>{children}</SlideFooterContext.Provider>
);

/** The footer of the deck the slide is drawn in, if it has one. */
export const useSlideFooter = (): SlideFooter.Settings | undefined => useContext(SlideFooterContext);

/** What a counter draws where it has no number, so a slide outside a deck still shows where one goes. */
export const NO_NUMBER = '–';

/** The number of the slide it is drawn on, among the slides the deck presents: Slidev's `<SlideCurrentNo />`. */
export const SlideCurrentNo = () => {
  const { current } = useSlidePosition();
  return (
    <span data-slide-counter='current' className='tabular-nums'>
      {current ?? NO_NUMBER}
    </span>
  );
};

/** How many slides the deck presents: Slidev's `<SlidesTotal />`. */
export const SlidesTotal = () => {
  const { total } = useSlidePosition();
  return (
    <span data-slide-counter='total' className='tabular-nums'>
      {total ?? NO_NUMBER}
    </span>
  );
};
