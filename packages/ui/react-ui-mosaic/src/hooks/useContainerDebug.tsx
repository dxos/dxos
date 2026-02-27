//
// Copyright 2025 DXOS.org
//

import React, { type FC, type ReactNode, forwardRef, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';

import { type ThemedClassName } from '@dxos/react-ui';
import { Json } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/ui-theme';

import { useMosaicContainer } from '../components';

export type UseContainerDebug = [FC<ThemedClassName>, (() => ReactNode) | undefined];

/**
 * Hook that returns a component to be rendered in the container's viewport (within the context),
 * and a component that creates a portal in the container's debug area.
 */
export const useContainerDebug = (debug?: boolean): UseContainerDebug => {
  const debugRef = useRef<HTMLDivElement | null>(null);
  return useMemo(() => {
    if (!debug) {
      return [() => null, undefined];
    }

    return [
      ({ classNames }) => <div role='none' className={mx('overflow-hidden', classNames)} ref={debugRef} />,
      () => debugRef.current && createPortal(<ContainerInfo />, debugRef.current),
    ];
  }, [debug, debugRef]);
};

const CONTAINER_INFO_NAME = 'ContainerInfo';

const ContainerInfo = forwardRef<HTMLDivElement, ThemedClassName>(({ classNames }, forwardedRef) => {
  const { id, state, activeLocation, scrolling } = useMosaicContainer(CONTAINER_INFO_NAME);
  const counter = useRef(0);
  return (
    <Json
      data={{ id, activeLocation, scrolling, state, count: counter.current++ }}
      classNames={mx('text-xs', classNames)}
      ref={forwardedRef}
    />
  );
});

ContainerInfo.displayName = CONTAINER_INFO_NAME;
