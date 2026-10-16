//
// Copyright 2026 DXOS.org
//

import React, { type CSSProperties, type PropsWithChildren, useEffect, useLayoutEffect, useRef } from 'react';

import { type FrameHandle, type FrameMode, type FrameText, createFrame } from './create-frame.ts';

export type FrameProps = PropsWithChildren<{
  mode?: FrameMode;
  header?: FrameText;
  caption?: FrameText;
  /** Overrides for the `--autocue-*` custom properties, which reach into the shadow root. */
  style?: CSSProperties;
}>;

/**
 * The title and caption bands around a recording. The DOM and styles live in `create-frame.ts` so autocue's driver
 * can inject the same frame into pages without React; children are projected into its content slot.
 */
export const Frame = ({ mode = 'layout', header, caption, style, children }: FrameProps) => {
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

  useEffect(() => handle.current?.setHeader(header), [mode, header?.title, header?.subtitle]);
  useEffect(() => handle.current?.setCaption(caption), [mode, caption?.title, caption?.subtitle]);

  return (
    <div ref={ref} className='flex flex-col dx-fill' style={style}>
      {children}
    </div>
  );
};
