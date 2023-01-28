//
// Copyright 2023 DXOS.org
//

import assert from 'node:assert';
import { ScribbleLoop, Trash } from 'phosphor-react';
import React, { useEffect, useRef, useState } from 'react';
import { GithubPicker } from 'react-color';
import { CanvasPath, ReactSketchCanvas } from 'react-sketch-canvas';

import { withReactor } from '@dxos/react-client';
import { getSize, mx } from '@dxos/react-components';

import { Button } from '../../components';
import { useSpace } from '../../hooks';
import { Path, Sketch } from '../../proto';

// TODO(burdon): Evaluate GLSP: https://www.eclipse.org/glsp

const convertToProtoPath = ({ startTimestamp, strokeWidth, strokeColor, paths }: CanvasPath): Path => ({
  timestamp: startTimestamp,
  width: strokeWidth,
  color: strokeColor,
  points: paths
});

const convertToCanvasPath = ({ width, color, points }: Path): CanvasPath =>
  ({
    drawMode: true,
    strokeWidth: width,
    strokeColor: color,
    paths: points
  } as CanvasPath);

const sizes: any[] = [
  { weight: 'thin', width: 1 },
  { weight: 'light', width: 4 },
  { weight: 'regular', width: 8 },
  { weight: 'bold', width: 16 }
];

const dimensions = { width: 900, height: 600 };

export const SketchFrame = withReactor(() => {
  const canvasRef = useRef<any>();
  const [strokeColor, setStrokeColor] = useState('#333');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const active = useRef(false); // TODO(burdon): Review ref pattern.

  const space = useSpace();
  const [sketch, setSketch] = useState<Sketch>();
  // TODO(burdon): Show list of sketch objects and auto-select/create one if missing.
  useEffect(() => {
    let sketch: Sketch;
    const result = space.experimental.db.query(Sketch.filter());
    const objects = result.getObjects();
    if (objects.length) {
      sketch = objects[0];
      setSketch(sketch);
    } else {
      sketch = new Sketch();
      setTimeout(async () => {
        await space.experimental.db.save(sketch);
        setSketch(sketch);
      });
    }

    void handleUpdate(sketch);

    return result.subscribe(() => {
      if (sketch && !active.current) {
        void handleUpdate(sketch);
      }
    });
  }, []);

  // TODO(burdon): Pseudo CRDT using timestamp on each path.
  const handleUpdate = async (sketch: Sketch) => {
    if (sketch.paths.length === 0) {
      canvasRef.current.resetCanvas();
      return;
    }

    const canvasPaths: CanvasPath[] = await canvasRef.current.exportPaths();
    const updatedPaths = sketch.paths.filter(({ timestamp }) => {
      return !canvasPaths.some((path) => path.startTimestamp === timestamp);
    });

    canvasRef.current.loadPaths(updatedPaths.map(convertToCanvasPath));
  };

  const handleStroke = (updated: CanvasPath) => {
    const { endTimestamp } = updated;
    if (!endTimestamp) {
      active.current = true;
      return;
    }

    assert(sketch);
    sketch.paths.push(convertToProtoPath(updated));
    active.current = false;

    // TODO(burdon): Check if updated.
    // TODO(burdon): Bug if concurrently editing (seems to connect points from both users?) Timestamp collision?
    //  - Delay update until stop drawing.
    void handleUpdate(sketch);
  };

  const handleColorChange = ({ hex }: { hex: string }) => setStrokeColor(hex);

  const handleClear = () => {
    sketch!.paths = [];
  };

  // TODO(burdon): Erase/undo.
  // https://www.npmjs.com/package/react-sketch-canvas
  // https://www.npmjs.com/package/react-color

  return (
    <div className='flex flex-col flex-1'>
      <div className='flex flex-col flex-1 items-center justify-center overflow-auto bg-gray-300'>
        <ReactSketchCanvas
          ref={canvasRef}
          style={{}}
          className='shadow-md'
          width={`${dimensions.width}px`}
          height={`${dimensions.height}px`}
          strokeWidth={strokeWidth}
          strokeColor={strokeColor}
          withTimestamp={true}
          onStroke={handleStroke}
        />
      </div>

      {/* TODO(burdon): Vertical unless mobile. */}
      <div className='flex flex-shrink-0 p-2 bg-gray-200'>
        <Button onClick={handleClear}>
          <Trash className={mx(getSize(6), 'mr-2')} />
        </Button>
        <GithubPicker width={'100%'} triangle='hide' onChangeComplete={handleColorChange} />
        <div className='flex items-center'>
          {sizes.map(({ weight, width }, i) => (
            <Button key={i} onClick={() => setStrokeWidth(width)}>
              <ScribbleLoop
                weight={weight}
                className={mx(getSize(8), 'mx-1', width === strokeWidth && 'bg-gray-200')}
              />
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
});
