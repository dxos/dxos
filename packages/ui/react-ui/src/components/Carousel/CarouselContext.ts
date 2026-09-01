//
// Copyright 2026 DXOS.org
//

import { createContext } from '@radix-ui/react-context';

import { type CarouselContextValue } from './Carousel.tsx';

// Kept out of `Carousel.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a context and its hook exported beside them force a full page reload on every edit.

export const CAROUSEL_NAME = 'Carousel';

export const [CarouselProvider, useCarouselContext] = createContext<CarouselContextValue>(CAROUSEL_NAME);

/** Returns the current carousel state. Must be used within {@link Carousel.Root}. */
export const useCarousel = (): CarouselContextValue => useCarouselContext('useCarousel');
