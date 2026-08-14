//
// Copyright 2025 DXOS.org
//

// Kept out of `Timeline.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so constants exported beside them force a full page reload on every edit.

export type TimelineOptions = {
  lineHeight: number;
  columnWidth: number;
  nodeRadius: number;
  lineStyle: string;
};

export const defaultOptions: TimelineOptions = {
  lineHeight: 24,
  columnWidth: 14,
  nodeRadius: 5,
  lineStyle: 'stroke-1',
};

export const compactOptions: TimelineOptions = {
  lineHeight: 20,
  columnWidth: 12,
  nodeRadius: 4,
  lineStyle: 'stroke-1',
};
