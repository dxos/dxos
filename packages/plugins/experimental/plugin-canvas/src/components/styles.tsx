//
// Copyright 2024 DXOS.org
//

import React from 'react';

// TODO(burdon): Theme.
export const styles = {
  gridLine: 'stroke-neutral-500',
  frameContainer: 'absolute flex p-2 justify-center items-center overflow-hidden bg-base',
  frameBorder: 'border border-neutral-500 rounded',
  frameSelected: '!bg-sky-300 !dark:bg-sky-700',
  frameHover: 'hover:bg-neutral-200 hover:dark:bg-neutral-800',
  anchor: 'bg-base border border-neutral-500 rounded hover:bg-orange-500',
  line: 'stroke-neutral-500 fill-neutral-500 dark:stroke-neutral-500 dark:fill-neutral-500',
  lineSelected: 'stroke-sky-300 dark:stroke-sky-700',
  cursor: 'stroke-primary-500 opacity-30',
};

export const eventsNone = 'pointer-events-none touch-none select-none';
export const eventsAuto = 'pointer-events-auto';

export const Markers = () => {
  return (
    <>
      <marker
        id='arrow'
        markerWidth={12}
        markerHeight={12}
        refX={12}
        refY={6}
        orient='auto'
        markerUnits='strokeWidth'
        className={styles.line}
      >
        <path d='M0,0 L0,12 L12,6 z' />
      </marker>
      <marker
        id='circle'
        markerWidth={12}
        markerHeight={12}
        refX={6}
        refY={6}
        orient='auto'
        markerUnits='strokeWidth'
        className={styles.line}
      >
        <circle cx={6} cy={6} r={5} />
      </marker>
    </>
  );
};
