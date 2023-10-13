//
// Copyright 2023 DXOS.org
//

// This implementation is based upon https://github.com/hosembafer/react-swipe-to-dismiss, commit d88deafe910a6bd1400cf8fa90459a76cf4f71d3

import { type RefObject, useCallback, useEffect, useState } from 'react';

enum MotionState {
  IDLE,
  DEBOUNCING,
  FOLLOWING,
}

type Options = Partial<{
  onDismiss: () => void;
  dismissThreshold: number;
  debounceThreshold: number;
  side: 'inline-start' | 'inline-end';
  offset: number;
}>;

export const useSwipeToDismiss = (
  ref: RefObject<HTMLElement | null>,
  { onDismiss, dismissThreshold = 64, debounceThreshold = 8, offset = 0 /* side = 'inline-start' */ }: Options,
) => {
  const $root = ref.current;
  // todo(thure): Implement other sides.
  // const dK = direction === 'inline-start' ? 1 : -1;

  const [motionState, setMotionState] = useState<MotionState>(MotionState.IDLE);
  const [gestureStartX, setGestureStartX] = useState(0);

  const setIdle = useCallback(() => {
    setMotionState(MotionState.IDLE);
    $root?.style.removeProperty('inset-inline-start');
    $root?.style.setProperty('transition-duration', '200ms');
  }, [$root]);

  const setFollowing = useCallback(() => {
    setMotionState(MotionState.FOLLOWING);
    $root?.style.setProperty('transition-duration', '0ms');
  }, [$root]);

  const handlePointerDown = useCallback(
    ({ screenX }: PointerEvent) => {
      if (motionState === MotionState.IDLE) {
        setMotionState(MotionState.DEBOUNCING);
        setGestureStartX(screenX);
      }
    },
    [motionState],
  );

  const handlePointerMove = useCallback(
    ({ screenX }: PointerEvent) => {
      if ($root) {
        const delta = Math.min(screenX - gestureStartX, 0);
        switch (motionState) {
          case MotionState.FOLLOWING:
            if (Math.abs(delta) > dismissThreshold) {
              setIdle();
              onDismiss?.();
            } else {
              $root.style.setProperty('inset-inline-start', `${offset + delta}px`);
            }
            break;
          case MotionState.DEBOUNCING:
            if (Math.abs(delta) > debounceThreshold) {
              setFollowing();
            }
            break;
        }
      }
    },
    [$root, motionState, gestureStartX],
  );

  const handlePointerUp = useCallback(() => {
    setIdle();
  }, [setIdle]);

  useEffect(() => {
    $root?.addEventListener('pointerdown', handlePointerDown);
    return () => {
      $root?.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [$root, handlePointerDown]);

  useEffect(() => {
    $root && document.documentElement.addEventListener('pointermove', handlePointerMove);
    return () => {
      document.documentElement.removeEventListener('pointermove', handlePointerMove);
    };
  }, [$root, handlePointerMove]);

  useEffect(() => {
    $root && document.documentElement.addEventListener('pointerup', handlePointerUp);
    return () => {
      document.documentElement.removeEventListener('pointerup', handlePointerUp);
    };
  }, [$root, handlePointerUp]);
};
