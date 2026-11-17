//
// Copyright 2023 DXOS.org
//

import React, { type PropsWithChildren, type RefObject, useLayoutEffect, useRef, useState } from 'react';

import type * as Util from '@dxos/react-ui/Util';
import { mx } from '@dxos/ui-theme';

import {
  slideThemeClasses,
  useSlideScrimSetting,
  useSlideThemeScrim,
  useSlideThemeStyle,
} from '../SlideTheme/SlideTheme.tsx';
import { ScrimContext } from './scrim.ts';

export type SlideCanvasProps = Util.ThemedClassName<
  PropsWithChildren<{
    /**
     * Inset the slide, with rounded corners, in the scrim that shows on every side. The scrim takes the theme's
     * slide background, as the letterbox bands do, so the inset reads as the slide's own margin rather than as a
     * surface of its own; a slide that paints its own background still reads as distinct within it.
     */
    inset?: boolean;
    /**
     * The scrim this host wants when neither the slide nor the deck names one: the editor's preview takes the app's
     * own scrim, so the panel reads as part of Composer rather than as a projection.
     */
    scrim?: string;
  }>
>;

/**
 * The 2560 × 1440 slide canvas scaled to fit its container (16:9); `Slide.Frame` and embedded text slides share it.
 */
export const SlideCanvas = ({ children, classNames, inset, scrim: hostScrim }: SlideCanvasProps) => {
  const themeStyle = useSlideThemeStyle();
  const deckScrim = useSlideScrimSetting();
  const themeScrim = useSlideThemeScrim();
  const containerRef = useRef<HTMLDivElement>(null);
  const size = useContainerSize(containerRef);
  // The slide's own scrim, published from inside. Nearest wins: the slide, then a deck that asked for a color, then
  // the host's, then the theme's own.
  const [slideScrim, setSlideScrim] = useState<string>();
  const scrimStyle = { backgroundColor: slideScrim ?? deckScrim ?? hostScrim ?? themeScrim };

  // TODO(burdon): Reconcile highlight colors with markdown editor.
  const frame = (
    <div
      ref={containerRef}
      {...(inset ? {} : { 'data-scrim-surface': '' })}
      className={mx(
        'flex grow relative overflow-hidden',
        // The radius is in canvas pixels, scaled with the slide, and applies only to this slide, not to slides embedded in it.
        inset ? 'bg-transparent [&>div>[data-slide]]:rounded-[32px]' : slideThemeClasses,
        classNames,
      )}
      style={inset ? undefined : { ...themeStyle, ...scrimStyle }}
    >
      <div className={mx('dx-expand absolute')} style={size ? createLayoutProps(size) : undefined}>
        <ScrimContext.Provider value={setSlideScrim}>{size && children}</ScrimContext.Provider>
      </div>
    </div>
  );

  // One color wherever a slide is letterboxed, inset or not, so the inset void and the bands never disagree.
  return inset ? (
    <div data-scrim-surface className='flex grow relative p-4 overflow-hidden' style={scrimStyle}>
      {frame}
    </div>
  ) : (
    frame
  );
};

type Size = { width: number; height: number };

/**
 * The container's size, measured before the first paint and on every resize (no debounce), so the slide is scaled in
 * the same frame its container changes: a debounced measure painted it at the old scale first (entering fullscreen,
 * resizing the grid) and then jumped.
 */
const useContainerSize = (ref: RefObject<HTMLDivElement | null>): Size | undefined => {
  const [size, setSize] = useState<Size>();
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    const measure = () => {
      const { width, height } = element.getBoundingClientRect();
      if (width && height) {
        setSize((previous) =>
          previous?.width === width && previous?.height === height ? previous : { width, height },
        );
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return size;
};

/**
 * Compute CSS properties to transform DIV to be full screen.
 *
 * Display resolutions:
 * window.screen.{availWidth, availHeight}
 *          5K Studio       16.2-inch Macbook Pro
 * Max      5120 x 2880     3456 x 2234
 * Default  2560 x 1440     1728 x 1117 (Actual height 1080 - 37 pixel notch)
 * Aspect   1.77 (16/9)     1.54
 */
const createLayoutProps = ({ width, height }: Size) => {
  // Config.
  const aspectRatio = 16 / 9;
  const nominalWidth = 2560;
  const nominalHeight = nominalWidth / aspectRatio;

  // NOTE: Hack to detect full height on Macbook Pro due to notch.
  // const macIntelNotch = 1117 - 1080;
  // const fullscreen =
  //   height === screen.availHeight ||
  //   (window.navigator.platform === 'MacIntel' && height === screen.availHeight - macIntelNotch);

  // If not fullscreen then make scale slightly smaller so there's a natural border.
  // const scaleFactor = fullscreen ? 1 : 0.95;

  // Compute scaling factor required.
  const scale = Math.min(width / nominalWidth, height / nominalHeight);

  return {
    left: (width - nominalWidth) / 2,
    top: (height - nominalHeight) / 2,
    width: nominalWidth,
    height: nominalHeight,
    transform: `scale(${scale})`,
  };
};
