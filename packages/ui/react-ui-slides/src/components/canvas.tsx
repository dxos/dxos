//
// Copyright 2023 DXOS.org
//

import React, { type PropsWithChildren, type RefObject, useLayoutEffect, useRef, useState } from 'react';

import type * as Util from '@dxos/react-ui/Util';
import { mx } from '@dxos/ui-theme';

import { ScrimContext } from './scrim.ts';
import {
  slideThemeClasses,
  useSlideScrimSetting,
  useSlideThemeScrim,
  useSlideThemeStyle,
} from './SlideTheme/SlideTheme.tsx';

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

/**
 * The 16:9 slide canvas, scaled to fit its container. Beside the canvas rather than in `Slide`, because it needs
 * none of what a slide resolves: given children it draws them, which is all a renderer wants.
 */
export const SlideFrame = ({ children, classNames, inset, scaled = true, scrim }: SlideFrameProps) =>
  scaled ? (
    <SlideCanvas inset={inset} classNames={classNames} scrim={scrim}>
      {children}
    </SlideCanvas>
  ) : (
    <div className='flex relative size-full'>{children}</div>
  );

SlideFrame.displayName = 'Slide.Frame';

export type SlideFrameProps = Util.ThemedClassName<
  PropsWithChildren<{
    /** Inset the slide in the scrim, with rounded corners, so its own background reads as distinct. */
    inset?: boolean;
    /** Scale the canvas to fit (default); print lays it out at its nominal size instead. */
    scaled?: boolean;
    /** The scrim to paint around the slide when neither the slide nor the deck names one. */
    scrim?: string;
  }>
>;

type Size = { width: number; height: number };

/**
 * The container's size, measured on every resize with no debounce, so the slide is scaled in the same frame its
 * container changes: a debounced measure painted it at the old scale first (entering fullscreen, resizing the grid)
 * and then jumped.
 *
 * The first measurement is the exception. A canvas mounted into a box that is still settling — the editor's preview
 * panel, which is remounted inside a splitter on every slide — measures a height its container does not keep, and
 * paints one frame at that scale before the observer corrects it, which reads as the slide's title jumping. So the
 * first size is committed a frame later, once layout has run; every one after that is immediate, as before.
 */
const useContainerSize = (ref: RefObject<HTMLDivElement | null>): Size | undefined => {
  const [size, setSize] = useState<Size>();
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    let settled = false;
    let frame = 0;
    const commit = ({ width, height }: Size) =>
      setSize((previous) => (previous?.width === width && previous?.height === height ? previous : { width, height }));
    const measure = () => {
      const { width, height } = element.getBoundingClientRect();
      if (width && height) {
        if (settled) {
          commit({ width, height });
        } else {
          settled = true;
          // The frame after layout: the container has the height it will keep, so nothing paints at the other one.
          frame = requestAnimationFrame(() => commit(element.getBoundingClientRect()));
        }
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
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
