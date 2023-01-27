//
// Copyright 2023 DXOS.org
//

import { ScribbleLoop, Trash } from 'phosphor-react';
import React, { useEffect, useRef, useState } from 'react';
import { GithubPicker } from 'react-color';
import { CanvasPath, ReactSketchCanvas } from 'react-sketch-canvas';

import { withReactor } from '@dxos/react-client';
import { getSize, mx } from '@dxos/react-components';

import { Button } from '../../components';
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

const sizes: any[] = [
  { weight: 'thin', width: 1 },
  { weight: 'regular', width: 4 },
  { weight: 'bold', width: 8 }
];

const dimensions = { width: 900, height: 600 };

export const SketchFrame = withReactor(() => {
  const canvasRef = useRef<any>();
  const [strokeColor, setStrokeColor] = useState('#333');
  const [strokeWidth, setStrokeWidth] = useState(4);

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

    // TODO(burdon): Pseudo CRDT using timestamp on each path.
    const handleUpdate = (sketch: Sketch) => {
      setTimeout(async () => {
        if (sketch.paths.length === 0) {
          canvasRef.current.resetCanvas();
          return;
        }

        const canvasPaths: CanvasPath[] = await canvasRef.current.exportPaths();
        const updatedPaths = sketch.paths.filter(({ timestamp }) => {
          return !canvasPaths.some((path) => path.startTimestamp === timestamp);
        });

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

  const handleErase = () => {
    sketch!.paths = [];
  };

  // https://www.npmjs.com/package/react-sketch-canvas
  // https://www.npmjs.com/package/react-color

  return (
    <div className='flex flex-col flex-1'>
      <div className='flex flex-col flex-1 items-center justify-center overflow-auto bg-gray-300'>
        <ReactSketchCanvas
          ref={canvasRef}
          style={{}}
          className='shadow-md'
          strokeWidth={strokeWidth}
          strokeColor={strokeColor}
          width={`${dimensions.width}px`}
          height={`${dimensions.height}px`}
          withTimestamp={true}
          onStroke={handleStroke}
        />
      </div>

      <div className='flex flex-shrink-0 p-2 bg-gray-100'>
        <Button onClick={handleErase}>
          <Trash className={mx(getSize(8), 'mr-2')} />
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
