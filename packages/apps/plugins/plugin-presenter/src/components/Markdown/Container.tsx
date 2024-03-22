//
// Copyright 2023 DXOS.org
//

import React, { type PropsWithChildren, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

export type ContainerProps = ThemedClassName<PropsWithChildren<{}>>;

/**
 * Scaled markdown container.
 */
export const Container = ({ children, classNames }: ContainerProps) => {
  const [props, setProps] = useState({});
  const {
    ref: containerRef,
    width,
    height,
  } = useResizeDetector({
    refreshMode: 'debounce',
    refreshRate: 200,
    refreshOptions: {
      leading: true,
    },
    onResize: (width, height) => {
      if (width && height) {
        setProps(createLayoutProps({ width, height }));
      }
    },
  });

  // TODO(burdon): Reconcile highlight colors with markdown editor.
  // https://www.npmjs.com/package/react-markdown
  return (
    <div ref={containerRef} className={mx('flex grow relative overflow-hidden bg-attention', classNames)}>
      <div className={mx('flex w-full h-full overflow-hidden absolute')} style={props}>
        {width && height && children}
      </div>
    </div>
  );
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
const createLayoutProps = ({ width, height }: { width: number; height: number }) => {
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
