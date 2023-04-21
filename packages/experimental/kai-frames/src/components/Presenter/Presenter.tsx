//
// Copyright 2023 DXOS.org
//

import React, { ReactNode, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useResizeDetector } from 'react-resize-detector';
import addClasses from 'rehype-add-classes';
import highlight from 'rehype-highlight';

import { mx } from '@dxos/aurora';

import { defaultClasses, defaultPadding, defaultStyles } from './styles';

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
const createProps = ({ width, height }: { width: number; height: number }) => {
  // Config.
  const aspectRatio = 16 / 9;
  const nominalWidth = 2560;
  const nominalHeight = nominalWidth / aspectRatio;

  // NOTE: Hack to detect full height on Macbook Pro due to notch.
  const macIntelNotch = 1117 - 1080;
  const fullscreen =
    height === screen.availHeight ||
    (window.navigator.platform === 'MacIntel' && height === screen.availHeight - macIntelNotch);

  // If not fullscreen then make scale slightly smaller so there's a natural border.
  const scaleFactor = fullscreen ? 1 : 0.9;

  // Compute scaling factor required.
  const scale = Math.min(width / nominalWidth, height / nominalHeight) * scaleFactor;

  return {
    left: (width - nominalWidth) / 2,
    top: (height - nominalHeight) / 2,
    width: nominalWidth,
    height: nominalHeight,
    transform: `scale(${scale})`
  };
};

export type PresenterProps = {
  content?: string;
  className?: string;
  classes?: { [selector: string]: string };
  topLeft?: ReactNode;
  topRight?: ReactNode;
  bottomLeft?: ReactNode;
  bottomRight?: ReactNode;
};

export const Presenter = ({
  content = '',
  className, // TODO(burdon): Change to slots.
  classes = defaultClasses,
  topLeft,
  topRight,
  bottomLeft,
  bottomRight
}: PresenterProps) => {
  const [props, setProps] = useState({});
  const {
    ref: containerRef,
    width = 0,
    height = 0
  } = useResizeDetector({
    refreshMode: 'debounce',
    refreshRate: 200,
    refreshOptions: {
      leading: true
    },
    onResize: (width, height) => {
      if (width && height) {
        setProps(createProps({ width, height }));
      }
    }
  });

  // TODO(burdon): Reconcile highlight colors with markdown editor.
  // https://www.npmjs.com/package/react-markdown
  return (
    <div ref={containerRef} className={mx('flex flex-1 relative overflow-hidden select-none', className ?? 'bg-black')}>
      {width && height && (
        <div
          // TODO(burdon): Full bleed app.
          className={mx('flex flex-col absolute transition', content[0] === '#' && defaultPadding, defaultStyles)}
          style={props}
        >
          {/* TODO(burdon): Wrap images. */}
          <ReactMarkdown rehypePlugins={[[highlight], [addClasses, classes]]}>{content}</ReactMarkdown>
        </div>
      )}
      <div className='absolute top-0 left-0'>{topLeft}</div>
      <div className='absolute top-0 right-0'>{topRight}</div>
      <div className='absolute bottom-0 left-0'>{bottomLeft}</div>
      <div className='absolute bottom-0 right-0'>{bottomRight}</div>
    </div>
  );
};
