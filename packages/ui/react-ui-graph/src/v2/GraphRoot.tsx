//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, useEffect, useRef, useState } from 'react';

import { type Engine } from '@dxos/graph-engine';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { EngineContextProvider } from './context';

export type GraphRootProps = ThemedClassName<PropsWithChildren<{ engine: Engine }>>;

/**
 * Provides EngineContext and a sized container. Owns the ResizeObserver.
 */
export const GraphRoot = ({ engine, classNames, children }: GraphRootProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    const rect = el.getBoundingClientRect();
    setSize({ width: rect.width, height: rect.height });
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (size.width && size.height) {
      engine.viewport.setSize(size);
    }
  }, [engine, size.width, size.height]);

  return (
    <EngineContextProvider value={engine}>
      <div ref={ref} className={mx('relative w-full h-full overflow-hidden', classNames)}>
        {children}
      </div>
    </EngineContextProvider>
  );
};
