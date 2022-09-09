//
// Copyright 2022 DXOS.org
//

import Matter from 'matter-js';
import React, { useEffect, useRef } from 'react';
import useResizeObserver from 'use-resize-observer';

import { FullScreen } from '@dxos/gem-core';

export default {
  title: 'gem-physik/Simple'
};

// TODO(burdon): See also:
// - https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API#libraries

const { Engine, Render, Runner, Bodies, Composite } = Matter;

/**
 * Simple matter-js Demo.
 * https://github.com/liabru/matter-js/wiki/Getting-started
 */
export const Primary = () => {
  const { ref: containerRef, width, height } = useResizeObserver<HTMLDivElement>();
  const canvasRef = useRef<HTMLCanvasElement>();

  // TODO(burdon): Animate DXOS logo.
  // TODO(burdon): Angry birds (using ECHO objects to construct castle -- for others to attack).

  useEffect(() => {
    if (!width || !height) {
      return;
    }

    // Elements (cx, cy, width, height).
    const boxA = Bodies.rectangle(40, 40, 80, 80);
    const boxB = Bodies.rectangle(400, 200, 80, 80);
    const boxC = Bodies.circle(450, 50, 60, 60);
    const platform1 = Bodies.rectangle(600, height * 0.7, 400, 20, { isStatic: true });
    const platform2 = Bodies.rectangle(20, height * 0.5, 40, 20, { isStatic: true });
    const platform3 = Bodies.rectangle(150, height * 0.9, 300, 20, { isStatic: true });

    // Engine.
    const engine = Engine.create();
    Composite.add(engine.world, [boxA, boxB, boxC, platform1, platform2, platform3]);

    // Canvas context.
    // https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
    // https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D
    const context = canvasRef.current.getContext('2d');
    console.log(context);

    // Renderer.
    Render.run(Render.create({
      canvas: canvasRef.current,
      engine,
      options: {
        width,
        height,
        showVelocity: true,
        showAxes: true
      }
    }));

    // Start the Engine.
    Runner.run(Runner.create(), engine);
  }, [width, height]);

  return (
    <FullScreen>
      <div
        ref={containerRef}
        style={{
          display: 'flex',
          overflow: 'hidden'
        }}
      >
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
        />
      </div>
    </FullScreen>
  );
};
