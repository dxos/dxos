//
// Copyright 2025 DXOS.org
//

import { type Extension } from '@codemirror/state';

import { isTruthy } from '@dxos/util';

import { type AutoScrollProps, autoScroll as autoScrollExtension } from './auto-scroll';
import { type CrawlerOptions, crawler } from './crawler';

export type ScrollerOptions = CrawlerOptions &
  AutoScrollProps & {
    /**
     * Include the auto-scroll policy (pin-to-bottom, user-scroll unpin, scroll-to-bottom button).
     * Set to `false` to get only the crawler primitive (line jumps, theme, overscroll spacer).
     * @default true
     */
    autoScroll?: boolean;
  };

/**
 * Composite scroll extension for streaming editor views (chat threads, transcripts, logs).
 */
export const scroller = ({ overScroll, scrollOnResize, autoScroll = true }: ScrollerOptions = {}): Extension[] => {
  return [crawler({ overScroll }), autoScroll && autoScrollExtension({ scrollOnResize })].filter(isTruthy);
};
