//
// Copyright 2023 DXOS.org
//

import { DownloadSimple, UploadSimple, ScribbleLoop, Trash } from '@phosphor-icons/react';
import React, { useEffect, useRef, useState } from 'react';
import { GithubPicker } from 'react-color';
import { CanvasPath, ReactSketchCanvas } from 'react-sketch-canvas';

import { Button } from '@dxos/aurora';
import { getSize, mx } from '@dxos/aurora-theme';
import { invariant } from '@dxos/invariant';
import { File, Sketch } from '@dxos/kai-types';
import { SpaceMember, useMembers, useSubscription } from '@dxos/react-client/echo';

import { InvitationQRCode } from '../../components';
import { useFrameContext, useFileDownload, useIpfsClient } from '../../hooks';

const colors = ['#000000', '#B80000', '#DB3E00', '#FCCB00', '#008B02', '#006B76', '#1273DE', '#004DCF', '#5300EB'];

// TODO(burdon): Shouldn't require use of constructor.
const convertToProtoPath = ({ startTimestamp, strokeWidth, strokeColor, paths }: CanvasPath): Sketch.Path => ({
  timestamp: startTimestamp,
  width: strokeWidth,
  color: strokeColor,
  points: paths,
});

const convertToCanvasPath = ({ width, color, points }: Sketch.Path): CanvasPath =>
  ({
    drawMode: true,
    strokeWidth: width,
    strokeColor: color,
    paths: points,
  }) as CanvasPath;

const sizes: any[] = [
  { weight: 'thin', width: 1 },
  { weight: 'light', width: 4 },
  { weight: 'regular', width: 8 },
  { weight: 'bold', width: 16 },
];

const dimensions = { width: 900, height: 600 };

export const SketchFrame = () => {
  const ipfsClient = useIpfsClient();
  const download = useFileDownload();
  const canvasRef = useRef<any>();
  const [strokeColor, setStrokeColor] = useState('#B80000');
  const [strokeWidth, setStrokeWidth] = useState(16);
  const active = useRef(false); // TODO(burdon): Review ref pattern.

  const { space, frame, objectId, fullscreen, onStateChange } = useFrameContext();
  const members = useMembers(space?.key);

  const sketch = objectId ? space!.db.getObjectById<Sketch>(objectId) : undefined;

  // Fullscreen
  useEffect(() => {
    const params = new URLSearchParams(document.location.search);
    const fullscreen = !!params.get('frame.fullscreen');
    if (fullscreen) {
      onStateChange?.({ fullscreen: true });
    }
  }, []);

  // Auto-create
  useEffect(() => {
    if (space && !sketch && fullscreen) {
      const obj = space.db.query(Sketch.filter()).objects[0] ?? space.db.add(new Sketch());

      // TODO(dmaretskyi): `setTimeout`, otherwise react-router freaks out.
      setTimeout(() => {
        onStateChange?.({ space, frame, objectId: obj.id }); // TODO(dmaretskyi): `space` and `frame` is required for navigation
      });
    }
  }, [space, fullscreen]);

  // Rendering
  // TODO(wittjosiah): Remove?
  useSubscription(() => {
    if (sketch) {
      setTimeout(async () => {
        await canvasRef.current.resetCanvas();
        void handleUpdate(sketch);
      });
    }
  }, [sketch]);

  if (!sketch) {
    return null;
  }

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

    invariant(sketch);
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
    await space?.db.add(file);
  };

  const handleReset = async () => {
    window.location.reload();
  };

  // TODO(burdon): Erase mode: eraseMode.
  // TODO(burdon): Undo.
  // https://www.npmjs.com/package/react-sketch-canvas
  // https://www.npmjs.com/package/react-color

  if (fullscreen) {
    return (
      <div className='relative flex flex-col bs-full bg-white' onClick={handleClear} onDoubleClick={handleReset}>
        <div className='flex z-10 flex-col flex-1 items-center justify-center overflow-auto'>
          <ReactSketchCanvas
            ref={canvasRef}
            // className='shadow-1'
            canvasColor='transparent'
            // style={{ background: 'transparent' }} // Replace defaults.
            width={'100%'}
            height={'100%'}
            strokeWidth={strokeWidth}
            strokeColor={strokeColor}
            withTimestamp={true}
            onStroke={handleStroke}
          />
        </div>

        <div className='fixed flex flex-col h-full flex-1 items-center place-items-center justify-center overflow-auto overflow-hidden w-full opacity-50 pointer-events-none'>
          <div className='flex w-3/4'>
            <InvitationQRCode space={space} />
          </div>
        </div>

        <div className='fixed bottom-0 z-10 overflow-hidden w-full pointer-events-none flex flex-row'>
          {members
            .filter((member) => member.presence === SpaceMember.PresenceState.ONLINE)
            .slice(1)
            .map((member) => (
              <div className='w-4 h-4 m-4 bg-black rounded-full' key={member.identity.identityKey.toHex()} />
            ))}
        </div>
      </div>
    );
  } else {
    return (
      <div className='flex flex-col bs-full'>
        <div className='flex flex-col flex-1 items-center justify-center overflow-auto'>
          <ReactSketchCanvas
            ref={canvasRef}
            className='shadow-1'
            style={{}} // Replace defaults.
            width={`${dimensions.width}px`}
            height={`${dimensions.height}px`}
            strokeWidth={strokeWidth}
            strokeColor={strokeColor}
            withTimestamp={true}
            onStroke={handleStroke}
          />
        </div>

        {/* TODO(burdon): Vertical unless mobile. */}
        <div className='flex shrink-0 px-8 p-2'>
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
            <Button variant='ghost' title='Clear' onClick={handleClear}>
              <Trash className={getSize(6)} />
            </Button>
            <Button variant='ghost' title='Download' onClick={handleDownload}>
              <DownloadSimple className={getSize(6)} />
            </Button>
            <Button variant='ghost' title='Upload to IPFS' onClick={handleUpload}>
              <UploadSimple className={getSize(6)} />
            </Button>
          </div>
        </div>
      </div>
    );
  }
};

export default SketchFrame;
