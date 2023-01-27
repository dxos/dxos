//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useRef, useState } from 'react';
import { GithubPicker } from 'react-color';
import { useResizeDetector } from 'react-resize-detector';
import { CanvasPath, ReactSketchCanvas } from 'react-sketch-canvas';

import { Path, Sketch } from '../../proto';

const convertToProtoPaths = (paths: CanvasPath[]): Path[] =>
  paths.map(({ strokeWidth, strokeColor, paths }) => ({
    width: strokeWidth,
    color: strokeColor,
    paths
  }));

const convertToPaths = ({ paths = [] }: Sketch): CanvasPath[] =>
  paths.map(
    ({ width, color, points }) =>
      ({
        drawMode: true,
        strokeWidth: width,
        strokeColor: color,
        paths: points
      } as CanvasPath)
  );

export const SketchFrame = () => {
  // https://www.npmjs.com/package/react-sketch-canvas
  // https://www.npmjs.com/package/react-art
  // https://www.npmjs.com/package/react-canvas-draw
  // https://www.npmjs.com/package/react-signature-canvas

  // https://www.npmjs.com/package/react-color

  const canvasRef = useRef<any>();
  const { ref: resizeRef, width, height } = useResizeDetector();
  const [lines, setLines] = useState<{ x: number; y: number }[]>([]);
  const [strokeColor, setStrokeColor] = useState('#333');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [paths, setPaths] = useState<CanvasPath[]>([]);
  const [sketch, setSketch] = useState<Sketch>(
    new Sketch({
      paths: [
        {
          width: 4,
          color: '#444',
          points: [
            { x: 100, y: 100 },
            { x: 120, y: 200 }
          ]
        }
      ]
    })
  );

  useEffect(() => {
    const paths = convertToPaths(sketch);
    canvasRef.current?.loadPaths(paths);
    setPaths(paths);
    console.log('#');
  }, [canvasRef]);

  const handleChange = (updatedPaths: CanvasPath[]) => {
    // const sketch = convertToProtoPaths(updatedPaths);
    // console.log('>>', paths.length, updatedPaths.length);
    // setPaths(updatedPaths);
  };

  const handleStroke = (updated: CanvasPath) => {
    const [path] = convertToProtoPaths([updated]);
    sketch.paths.push(path);
  };

  const handleColorChange = ({ hex }: { hex: string }) => setStrokeColor(hex);

  // TODO(burdon): Lazy draw.

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
          onChange={handleChange}
          onStroke={handleStroke}
        />
      </div>
      <div className='flex flex-shrink-0 p-2 bg-gray-100'>
        <GithubPicker width={'100%'} triangle={null} onChangeComplete={handleColorChange} />
      </div>
    </div>
  );
};
