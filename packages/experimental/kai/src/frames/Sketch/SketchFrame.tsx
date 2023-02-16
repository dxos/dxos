//
// Copyright 2023 DXOS.org
//

import assert from 'assert';
import { DownloadSimple, UploadSimple, ScribbleLoop, Trash } from 'phosphor-react';
import React, { useEffect, useRef, useState } from 'react';
import { GithubPicker } from 'react-color';
import { CanvasPath, ReactSketchCanvas } from 'react-sketch-canvas';

import { withReactor } from '@dxos/react-client';
import { Button, getSize, mx } from '@dxos/react-components';

import { useFileDownload, useIpfsClient, useSpace } from '../../hooks';
import { File, Path, Sketch } from '../../proto';

const colors = ['#000000', '#B80000', '#DB3E00', '#FCCB00', '#008B02', '#006B76', '#1273DE', '#004DCF', '#5300EB'];

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
  const download = useFileDownload();
  const canvasRef = useRef<any>();
  const [strokeColor, setStrokeColor] = useState('#333');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const active = useRef(false); // TODO(burdon): Review ref pattern.
  const ipfsClient = useIpfsClient();

  const space = useSpace();
  const [sketch, setSketch] = useState<Sketch>();

  // TODO(burdon): Show list of sketch objects and auto-select/create one if missing.
  useEffect(() => {
    let sketch: Sketch;
    const result = space.db.query(Sketch.filter());
    const objects = result.objects;
    if (objects.length) {
      sketch = objects[0];
      setSketch(sketch);
    } else {
      sketch = new Sketch();
      setTimeout(async () => {
        await space.db.add(sketch);
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

  const handleDownload = async () => {
    const svg = await canvasRef.current.exportSvg();
    download(new Blob([svg], { type: 'image/svg+xml' }), 'image.svg');
  };

  // TODO(burdon): Factor out.
  const handleUpload = async () => {
    const name = new Date().toISOString().slice(0, 10) + '.svg';
    const svg = await canvasRef.current.exportSvg();
    const { cid, path } = await ipfsClient.add(new Blob([svg]));
    await ipfsClient.pin.add(cid);
    const file = new File({ name, cid: path });
    await space.db.add(file);
  };

  // TODO(burdon): Erase mode: eraseMode.
  // TODO(burdon): Undo.
  // https://www.npmjs.com/package/react-sketch-canvas
  // https://www.npmjs.com/package/react-color

  return (
    <div className='flex flex-col bs-full'>
      <div className='flex flex-col flex-1 items-center justify-center overflow-auto'>
        <ReactSketchCanvas
          ref={canvasRef}
          style={{}}
          className='shadow-1'
          width={`${dimensions.width}px`}
          height={`${dimensions.height}px`}
          strokeWidth={strokeWidth}
          strokeColor={strokeColor}
          withTimestamp={true}
          onStroke={handleStroke}
        />
      </div>

      {/* TODO(burdon): Vertical unless mobile. */}
      <div className='flex shrink-0 p-2'>
        <div className='flex items-center mr-4'>
          <GithubPicker width={'100%'} triangle='hide' colors={colors} onChangeComplete={handleColorChange} />
        </div>

        <div className='flex items-center'>
          {sizes.map(({ weight, width }, i) => (
            <div key={i} onClick={() => setStrokeWidth(width)}>
              <ScribbleLoop
                weight={weight}
                className={mx(getSize(8), 'ml-1', width === strokeWidth && 'bg-selection-bg')}
              />
            </div>
          ))}
        </div>

        <div className='flex-1' />

        <div className='flex items-center'>
          <Button compact variant='ghost' title='Clear' onClick={handleClear}>
            <Trash className={getSize(6)} />
          </Button>
          <Button compact variant='ghost' title='Download' onClick={handleDownload}>
            <DownloadSimple className={getSize(6)} />
          </Button>
          <Button compact variant='ghost' title='Upload' onClick={handleUpload}>
            <UploadSimple className={getSize(6)} />
          </Button>
        </div>
      </div>
    </div>
  );
});
