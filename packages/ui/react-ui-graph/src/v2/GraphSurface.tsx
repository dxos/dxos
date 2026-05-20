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

/**
 * Mounts a Canvas backend onto a <canvas>, wires the default tools (hover/select/zoom),
 * and starts the engine. The semantic event callback is read through a ref so the effect
 * does not re-run on each parent render — re-running would detach and re-attach the tools,
 * which would (a) reset ZoomTool's centering state and (b) restart the engine loop.
 */
export const GraphSurface = ({ className, onSemanticEvent }: GraphSurfaceProps) => {
  const engine = useEngineContext();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onSemanticEventRef = useRef(onSemanticEvent);
  onSemanticEventRef.current = onSemanticEvent;

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

    const emit = (e: SemanticPointerEvent) => onSemanticEventRef.current?.(e);
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
  }, [engine]);

  return <canvas ref={canvasRef} className={className} />;
};
