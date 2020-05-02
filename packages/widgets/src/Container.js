//
// Copyright 2018 DxOS
//

import * as d3 from 'd3';
import React from 'react';
import useResizeAware from 'react-resize-aware';

const style = {
  position: 'relative',
  display: 'flex',
  flex: 1,
  overflow: 'hidden'        // Otherwise children will prevent shrinking.
};

/**
 * NOTE: Hooks cannot be used with a class.
 * https://www.npmjs.com/package/react-resize-aware
 * https://reactjs.org/docs/hooks-reference.html
 */
// TODO(burdon): Replace with spore/View
export const Container = (props) => {
  const { children, className, onRender } = props;
  const [ resizeListener, { width = 0, height = 0 } ] = useResizeAware();

  // Called after render.
  // https://reactjs.org/docs/hooks-effect.html
  React.useEffect(() => {
    if (width && height) {
      onRender({ width, height });
    }
  });

  // TODO(burdon): Don't allow to override styles.
  return (
    <div {...{ className }} style={style}>
      {resizeListener}
      {children}
    </div>
  );
};

/**
 * Returns bounds of element.
 */
export const bounds = (el) => {
  if (!el) {
    return {
      width: 0,
      height: 0
    };
  }

  const selected = d3.select(el);

  return {
    width: Number(selected.attr('width')) || 0,
    height: Number(selected.attr('height')) || 0
  };
};

/**
 * Sets the size of an element.
 * @param el
 * @param width
 * @param height
 * @return {boolean} true if resized.
 */
export const resize = (el, { width, height }) => {
  const { width: currentWidth, height: currentHeight } = bounds(el);
  if (width !== currentWidth || height !== currentHeight) {
    d3.select(el)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `${-width / 2}, ${-height / 2}, ${width}, ${height}`);

    return true;
  }
};

/**
 * Generic throttled callback.
 */
export const delayedListener = (callback, delay = 100) => {
  let timeout = 0;
  let skipped = 0;

  return function() {
    const args = arguments;

    if (timeout) {
      clearInterval(timeout);
      skipped++;
    }

    timeout = setTimeout(() => {
      callback(...args);
      timeout = 0;
    }, delay);
  };
};
