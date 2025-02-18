//
// Copyright 2024 DXOS.org
//

// TODO(burdon): Theme.
export const styles = {
  gridLine: 'stroke-unAccent',
  frameContainer: 'absolute flex p-2 items-center overflow-hidden bg-baseSurface',
  frameBorder: 'border border-unAccent rounded',
  frameSelected: 'border-2 border-sky-500',
  frameActive: 'bg-sky-200 dark:bg-sky-800',
  frameHover: 'hover:bg-neutral-200 hover:dark:bg-neutral-800',
  frameGuide: 'border-green-500 border-dashed !opacity-50 !bg-transparent',
  anchor: 'bg-baseSurface border border-unAccent rounded hover:bg-orange-500',
  line: 'fill-baseSurface [--dx-stroke-color:theme(colors.neutral.500)]',
  lineSelected: 'stroke-sky-500 [--dx-stroke-color:theme(colors.sky.500)]',
  lineGuide: '!stroke-green-500 [stroke-dasharray:6_6]',
  cursor: 'stroke-accent opacity-30',
};

export const eventsNone = 'pointer-events-none touch-none select-none';
export const eventsAuto = 'pointer-events-auto';
