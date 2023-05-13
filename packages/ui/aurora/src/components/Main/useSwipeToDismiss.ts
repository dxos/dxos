//
// Copyright 2023 DXOS.org
//

// This implementation is based upon https://github.com/hosembafer/react-swipe-to-dismiss, commit d88deafe910a6bd1400cf8fa90459a76cf4f71d3

import { RefObject, useCallback, useEffect, useState } from 'react';

const getScreenX = (event: MouseEvent | TouchEvent) => {
  let screenX;
  if (event instanceof TouchEvent) {
    screenX = event.touches[0].screenX;
  } else {
    screenX = (event as MouseEvent).screenX;
  }
  return screenX;
};

export const useSwipeToDismiss = (
  ref: RefObject<HTMLElement | null>,
  onDismiss: () => void,
  distanceBeforeDismiss = 100,
  direction = 'right',
  offset = 0
) => {
  const node = ref.current;
  const directionValue = direction === 'right' ? 1 : -1;

  const [removing, setRemoving] = useState(false);
  const [pressedPosition, setPressedPosition] = useState(0);
  const [positionLeft, setPositionLeft] = useState(0);
  const [animate, setAnimate] = useState(false);

  const remove = useCallback(() => {
    onDismiss();
    setTimeout(() => {
      setRemoving(false);
      setPositionLeft(0);
      setPressedPosition(0);
      setAnimate(false);
    }, 200);
  }, [node, onDismiss]);

  const onMouseUp = useCallback(() => {
    if (!node) {
      return;
    }
    setAnimate(true);
    if (!removing && positionLeft * directionValue >= (node.offsetWidth * distanceBeforeDismiss) / 100) {
      setPositionLeft(positionLeft + node.offsetWidth * directionValue);
      setRemoving(true);
      remove();
    } else {
      setPositionLeft(0);
    }
    setPressedPosition(0);
  }, [node, removing, positionLeft, directionValue, distanceBeforeDismiss]);

  const onMouseMove = useCallback(
    (event: MouseEvent | TouchEvent) => {
      event.preventDefault();
      if (!node || removing) {
        return;
      }

      const screenX = getScreenX(event);

      if (pressedPosition) {
        let nextPositionLeft = screenX - pressedPosition;

        if (direction === 'right') {
          nextPositionLeft = nextPositionLeft < 0 ? 0 : nextPositionLeft;
        } else {
          nextPositionLeft = nextPositionLeft > 0 ? 0 : nextPositionLeft;
        }

        setPositionLeft(nextPositionLeft);
      }
    },
    [removing, pressedPosition, direction, node, remove]
  );

  const onMouseDown = useCallback((event: MouseEvent | TouchEvent) => {
    const screenX = getScreenX(event);
    setPressedPosition(screenX);
    setAnimate(false);
  }, []);

  useEffect(() => {
    node?.addEventListener('mousedown', onMouseDown);
    node?.addEventListener('touchstart', onMouseDown);
    return () => {
      node?.removeEventListener('mousedown', onMouseDown);
      node?.removeEventListener('touchstart', onMouseDown);
    };
  }, [node, onMouseDown]);

  useEffect(() => {
    node?.addEventListener('mouseup', onMouseUp);
    node?.addEventListener('mousemove', onMouseMove);

    node?.addEventListener('touchmove', onMouseMove, { passive: false });
    node?.addEventListener('touchend', onMouseUp);

    return () => {
      node?.removeEventListener('mouseup', onMouseUp);
      node?.removeEventListener('mousemove', onMouseMove);

      node?.removeEventListener('touchmove', onMouseMove);
      node?.removeEventListener('touchend', onMouseMove);
    };
  }, [onMouseUp, onMouseDown, onMouseMove]);

  useEffect(() => {
    if (!node) {
      return;
    }
    if (positionLeft === 0) {
      node.style.removeProperty('inset-inline-start');
    } else {
      node.style.setProperty('inset-inline-start', `${offset + positionLeft}px`);
    }
    if (animate) {
      node.style.setProperty('transition-duration', '200ms');
    } else {
      node.style.setProperty('transition-duration', '0ms');
    }
  }, [animate, positionLeft]);
};
