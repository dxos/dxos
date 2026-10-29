//
// Copyright 2026 DXOS.org
//

import React, { type CSSProperties, type PropsWithChildren, useEffect, useLayoutEffect, useRef } from 'react';

import {
  type BandStyle,
  type CaptionPosition,
  type FrameColors,
  type FrameHandle,
  type FrameMode,
  type FrameSize,
  type FrameText,
  createFrame,
} from './create-frame.ts';

export type FrameProps = PropsWithChildren<{
  mode?: FrameMode;
  header?: FrameText;
  caption?: FrameText;
  /** Layout only: the recording's size; the frame keeps its aspect ratio and scales to fit. */
  size?: FrameSize;
  /** Floating `panel` (default) or full-width `band`. */
  captionStyle?: BandStyle;
  /** Top, middle or bottom (default). */
  captionPosition?: CaptionPosition;
  /** Opacity (0-1) of the caption panel's background; unset keeps the token's default. */
  captionBackground?: number;
  /** White on black or black on white for the title and captions; unset, panels invert the page's theme. */
  colors?: FrameColors;
  /** On, the header also shows as a translucent band over the top; off (default), only as the open title. */
  headerBand?: boolean;
  /** Milliseconds to hold the header as a centred panel on mount; remount (a new `key`) to replay it. */
  open?: number;
  /** Overrides for the `--autocue-*` custom properties, which reach into the shadow root. */
  style?: CSSProperties;
}>;

/**
 * The title and caption bands around a recording. The DOM and styles live in `create-frame.ts` so autocue's driver
 * can inject the same frame into pages without React; children are projected into its content slot.
 */
export const Frame = ({
  mode = 'layout',
  header,
  caption,
  size,
  captionStyle = 'panel',
  captionPosition = 'bottom',
  captionBackground,
  colors,
  headerBand = false,
  open,
  style,
  children,
}: FrameProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const handle = useRef<FrameHandle | null>(null);

  // The mode decides the frame's structure, so a new mode builds a new frame.
  useLayoutEffect(() => {
    const host = ref.current;
    if (!host) {
      return;
    }

    const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
    const frame = createFrame(root, { mode });
    handle.current = frame;
    return () => {
      frame.dispose();
      handle.current = null;
    };
  }, [mode]);

  // Block bodies: a handle method's return value must not reach React as an effect cleanup.
  useEffect(() => {
    handle.current?.setHeader(header);
  }, [mode, header?.title, header?.subtitle]);
  useEffect(() => {
    handle.current?.setCaption(caption);
  }, [mode, caption?.title, caption?.subtitle]);
  useEffect(() => {
    handle.current?.setSize(size);
  }, [mode, size?.width, size?.height]);
  useEffect(() => {
    handle.current?.setCaptionStyle(captionStyle);
  }, [mode, captionStyle]);
  useEffect(() => {
    handle.current?.setCaptionPosition(captionPosition);
  }, [mode, captionPosition]);
  useEffect(() => {
    handle.current?.setCaptionBackground(captionBackground);
  }, [mode, captionBackground]);
  useEffect(() => {
    handle.current?.setColors(colors);
  }, [mode, colors]);
  useEffect(() => {
    handle.current?.setHeaderBand(headerBand);
  }, [mode, headerBand]);
  // After the header effect, so the open title shows the current title.
  useEffect(() => {
    if (open) {
      void handle.current?.playOpen(open);
    }
  }, [mode, open]);

  return (
    <div ref={ref} className='flex flex-col dx-fill' style={style}>
      {children}
    </div>
  );
};
