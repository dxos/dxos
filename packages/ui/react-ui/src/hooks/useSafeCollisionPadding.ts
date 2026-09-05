//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { type SafeAreaPadding } from './useSafeArea';
import { useThemeContext } from './useThemeContext';

/** A uniform inset, or one per side — the shape Radix's popper took and Zag's `overflowPadding` takes. */
export type CollisionPadding = number | Partial<Record<'top' | 'right' | 'bottom' | 'left', number>>;

type PaddingProp = CollisionPadding | undefined;
type PaddingRecord = Exclude<PaddingProp, number | undefined>;

const propIsNumber = (prop: PaddingProp): prop is number => Number.isFinite(prop);
const propsIsRecord = (prop: PaddingProp): prop is PaddingRecord => !!(prop && typeof prop === 'object');

// The safe area is optional on the theme context, and absent entirely when a consumer resolves the
// fallback context — which any portalled surface does under the dev server's dual-module split. Its
// insets are also `NaN` until the first viewport measurement, so every read here is already written
// to fall back to zero; an absent object is the same case, not a different one.
const safePadding = (propsPadding: PaddingProp, safeArea: SafeAreaPadding | undefined, side: keyof SafeAreaPadding) => {
  const inset = safeArea?.[side];
  return (
    (propIsNumber(inset) ? inset : 0) +
    (propIsNumber(propsPadding) ? propsPadding : propsIsRecord(propsPadding) ? (propsPadding[side] ?? 0) : 0)
  );
};

export const useSafeCollisionPadding = (collisionPadding?: PaddingProp) => {
  const { safeAreaPadding } = useThemeContext();
  return useMemo(
    () => ({
      top: safePadding(collisionPadding, safeAreaPadding, 'top'),
      right: safePadding(collisionPadding, safeAreaPadding, 'right'),
      bottom: safePadding(collisionPadding, safeAreaPadding, 'bottom'),
      left: safePadding(collisionPadding, safeAreaPadding, 'left'),
    }),
    [collisionPadding, safeAreaPadding],
  );
};
