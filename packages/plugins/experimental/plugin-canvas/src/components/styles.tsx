//
// Copyright 2024 DXOS.org
//

// TODO(burdon): Theme.
export const styles = {
  gridLine: 'stroke-neutral-500 opacity-5',
  frameContainer: 'absolute flex p-2 items-center overflow-hidden bg-base',
  frameBorder: 'border border-neutral-500 rounded',
  frameSelected: '!bg-sky-300 !dark:bg-sky-700',
  frameActive: 'bg-sky-200 dark:bg-sky-800',
  frameHover: 'hover:bg-neutral-200 hover:dark:bg-neutral-800',
  frameGuide: 'border-green-500 border-dashed !opacity-50 !bg-transparent',
  anchor: 'bg-base border border-neutral-500 rounded hover:bg-orange-500',
  line: 'fill-base [--dx-stroke-color:theme(colors.neutral.500)]',
  lineSelected: 'stroke-sky-500 [--dx-stroke-color:theme(colors.sky.500)]',
  lineGuide: '!stroke-green-500 [stroke-dasharray:6_6]',
  cursor: 'stroke-primary-500 opacity-30',
};

export const eventsNone = 'pointer-events-none touch-none select-none';
export const eventsAuto = 'pointer-events-auto';
