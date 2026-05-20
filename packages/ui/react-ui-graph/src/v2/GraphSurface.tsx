//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useRef } from 'react';

import { CanvasBackend, HoverTool, SelectTool, ZoomTool, type SemanticPointerEvent } from '@dxos/graph-engine';

import { useEngineContext } from './context';

export type GraphSurfaceProps = {
  className?: string;
  onSemanticEvent?: (event: SemanticPointerEvent) => void;
};

export const GraphSurface = ({ className, onSemanticEvent }: GraphSurfaceProps) => {
  const engine = useEngineContext();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const backend = new CanvasBackend(canvas);
    engine.setBackend(backend);

    const dpr = window.devicePixelRatio ?? 1;
    const offResize = engine.viewport.resized.on((s) => backend.resize(s.width, s.height, dpr));
    if (engine.viewport.size.width) {
      backend.resize(engine.viewport.size.width, engine.viewport.size.height, dpr);
    }

    const emit = (e: SemanticPointerEvent) => onSemanticEvent?.(e);
    const hover = new HoverTool(emit);
    const select = new SelectTool(emit);
    const zoom = new ZoomTool(engine.viewport);

    const detach = [hover.attach(engine, canvas), select.attach(engine, canvas), zoom.attach(engine, canvas)];

    engine.start();

    return () => {
      detach.forEach((fn) => fn());
      engine.stop();
      engine.setBackend(undefined);
      offResize();
    };
  }, [engine, onSemanticEvent]);

  return <canvas ref={canvasRef} className={className} />;
};
