//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useRef, useState } from 'react';
import { GithubPicker } from 'react-color';
import { useResizeDetector } from 'react-resize-detector';
import { CanvasPath, ReactSketchCanvas } from 'react-sketch-canvas';

import { withReactor } from '@dxos/react-client';

import { useSpace } from '../../hooks';
import { Path, Sketch } from '../../proto';

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

export const SketchFrame = withReactor(() => {
  const canvasRef = useRef<any>();
  const { ref: resizeRef, width, height } = useResizeDetector();
  const [strokeColor, setStrokeColor] = useState('#333');
  const [strokeWidth, setStrokeWidth] = useState(4);

  const space = useSpace();
  const [sketch, setSketch] = useState<Sketch>();
  const [paths, setPaths] = useState<CanvasPath[]>([]);
  // TODO(burdon): Show list of sketch objects.
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

    // TODO(burdon): Pseudo CRDT using timestamp on each path.
    const handleUpdate = (sketch: Sketch) => {
      setTimeout(async () => {
        const canvasPaths: CanvasPath[] = await canvasRef.current.exportPaths();
        const updatedPaths = sketch.paths.filter(({ timestamp }) => {
          return !canvasPaths.some((path) => path.startTimestamp === timestamp);
        });

        console.log(canvasPaths.length, updatedPaths.length);
        canvasRef.current.loadPaths(updatedPaths.map(convertToCanvasPath));
      });
    };

    handleUpdate(sketch);

    return result.subscribe(() => {
      if (sketch) {
        handleUpdate(sketch);
      }
    });
  }, []);

  const handleStroke = (updated: CanvasPath) => {
    const { endTimestamp } = updated;
    if (!endTimestamp) {
      return;
    }

    sketch?.paths.push(convertToProtoPath(updated));
  };

  const handleColorChange = ({ hex }: { hex: string }) => setStrokeColor(hex);

  // https://www.npmjs.com/package/react-sketch-canvas
  // https://www.npmjs.com/package/react-color

  return (
    <div className='flex flex-col flex-1'>
      <div ref={resizeRef} className='flex flex-col flex-1'>
        <ReactSketchCanvas
          ref={canvasRef}
          style={{}}
          strokeWidth={strokeWidth}
          strokeColor={strokeColor}
          width={`${width}px`}
          height={`${height}px`}
          withTimestamp={true}
          onStroke={handleStroke}
        />
      </div>
      <div className='flex flex-shrink-0 p-2 bg-gray-100'>
        <GithubPicker width={'100%'} triangle={null} onChangeComplete={handleColorChange} />
      </div>
    </div>
  );
});
