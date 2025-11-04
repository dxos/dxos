//
// Copyright 2025 DXOS.org
//

import { type TooltipContentProps } from '@radix-ui/react-tooltip';
import { useMemo } from 'react';

import { type SafeAreaPadding } from './useSafeArea';
import { useThemeContext } from './useThemeContext';

type PaddingProp = TooltipContentProps['collisionPadding'];
type PaddingRecord = Exclude<PaddingProp, number | undefined>;

const propIsNumber = (prop: PaddingProp): prop is number => Number.isFinite(prop);
const propsIsRecord = (prop: PaddingProp): prop is PaddingRecord => !!(prop && typeof prop === 'object');

const safePadding = (
  propsPadding: TooltipContentProps['collisionPadding'],
  safePadding: SafeAreaPadding,
  side: keyof SafeAreaPadding,
) =>
  (propIsNumber(safePadding[side]) ? safePadding[side] : 0) +
  (propIsNumber(propsPadding) ? propsPadding : propsIsRecord(propsPadding) ? (propsPadding[side] ?? 0) : 0);

export const useSafeCollisionPadding = (collisionPadding?: PaddingProp) => {
  const { safeAreaPadding } = useThemeContext();
  return useMemo(
    () => ({
      top: safePadding(collisionPadding, safeAreaPadding!, 'top'),
      right: safePadding(collisionPadding, safeAreaPadding!, 'right'),
      bottom: safePadding(collisionPadding, safeAreaPadding!, 'bottom'),
      left: safePadding(collisionPadding, safeAreaPadding!, 'left'),
    }),
    [collisionPadding, safeAreaPadding],
  );
};
