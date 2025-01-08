//
// Copyright 2024 DXOS.org
//

// TODO(burdon): Theme.
export const styles = {
  gridLine: 'stroke-neutral-500',
  frameContainer: 'absolute flex items-center overflow-hidden bg-base',
  frameBorder: 'border border-hoverSurface rounded-lg',
  framePreview: 'opacity-80',
  frameSelected: 'border-primary-500',
  frameActive: 'border-primary-500',
  frameHover: 'hover:border-orange-500',
  frameGuide: 'border-green-500 border-dashed !opacity-50 !bg-transparent',
  anchor: 'bg-base border border-neutral-500 rounded-[50%] hover:bg-orange-500',
  anchorActive: 'bg-orange-500',
  path: 'fill-base [--dx-stroke-color:theme(colors.neutral.500)]',
  pathSelected: 'stroke-sky-500 [--dx-stroke-color:theme(colors.sky.500)]',
  pathHover: 'hover:border-orange-500',
  pathGuide: '!stroke-green-500 [stroke-dasharray:6_6]',
  cursor: 'stroke-primary-500 opacity-30',
};

export const eventsNone = 'pointer-events-none touch-none select-none';
export const eventsAuto = 'pointer-events-auto';
