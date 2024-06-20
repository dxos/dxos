//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { type SerializedStore } from '@tldraw/store';
import { type TLRecord } from '@tldraw/tldraw';
import React, { useState } from 'react';

import { CanvasType, SketchType } from '@braneframe/types';
import { migrateCanvas } from '@braneframe/types/migrations';
import { createEchoObject } from '@dxos/echo-db';
import { create } from '@dxos/echo-schema';
import { FullscreenDecorator } from '@dxos/react-client/testing';
import { Button, Toolbar } from '@dxos/react-ui';
import { withTheme } from '@dxos/storybook-utils';

import SketchComponent from './Sketch';

const data = {
  // NOTE: Contains legacy arrow shapes which will cause the one-shot migration to fail.
  v1: JSON.parse(
    '{"document:document":{"gridSize":10,"name":"","meta":{},"id":"document:document","typeName":"document"},"page:4erp5FF7mts21Njur5UKw":{"meta":{},"id":"page:4erp5FF7mts21Njur5UKw","name":"Page 1","index":"a1","typeName":"page"},"shape:_-1kyVBGSUAeNrcxiGAbw":{"x":147.90625,"y":252.66796875,"rotation":0,"isLocked":false,"opacity":1,"meta":{},"id":"shape:_-1kyVBGSUAeNrcxiGAbw","type":"geo","props":{"w":102.09375,"h":102.09375,"geo":"rectangle","color":"black","labelColor":"black","fill":"none","dash":"dotted","size":"l","font":"draw","text":"","align":"middle","verticalAlign":"middle","growY":0,"url":""},"parentId":"page:4erp5FF7mts21Njur5UKw","index":"a1","typeName":"shape"},"shape:kXmGpjXqyzlg1savamgn8":{"x":390,"y":220,"rotation":0,"isLocked":false,"opacity":1,"meta":{},"id":"shape:kXmGpjXqyzlg1savamgn8","type":"geo","props":{"w":146.53341161753187,"h":146.53341161753187,"geo":"star","color":"yellow","labelColor":"black","fill":"none","dash":"draw","size":"m","font":"draw","text":"","align":"middle","verticalAlign":"middle","growY":0,"url":""},"parentId":"page:4erp5FF7mts21Njur5UKw","index":"a2","typeName":"shape"},"shape:F_o1eH6pS_ABcU3-JPadv":{"x":196.6484375,"y":312.359375,"rotation":0,"isLocked":false,"opacity":1,"meta":{},"id":"shape:F_o1eH6pS_ABcU3-JPadv","type":"arrow","parentId":"page:4erp5FF7mts21Njur5UKw","index":"a3","props":{"dash":"draw","size":"s","fill":"none","color":"blue","labelColor":"black","bend":-118.87115471648073,"start":{"type":"binding","boundShapeId":"shape:_-1kyVBGSUAeNrcxiGAbw","normalizedAnchor":{"x":0.5,"y":0.5},"isExact":false},"end":{"type":"binding","boundShapeId":"shape:kXmGpjXqyzlg1savamgn8","normalizedAnchor":{"x":0.5,"y":0.5},"isExact":false},"arrowheadStart":"none","arrowheadEnd":"arrow","text":"","font":"draw"},"typeName":"shape"},"shape:eYiyZDA7Iwoi16QjTkJUE":{"x":340,"y":420,"rotation":6.09119908946021,"isLocked":false,"opacity":1,"meta":{},"id":"shape:eYiyZDA7Iwoi16QjTkJUE","type":"text","props":{"color":"light-green","size":"xl","w":317.8125,"text":"HELLO WORLD!","font":"mono","align":"middle","autoSize":true,"scale":1},"parentId":"page:4erp5FF7mts21Njur5UKw","index":"a4","typeName":"shape"}}',
  ),
  v2: JSON.parse(
    '{"document:document":{"gridSize":10,"name":"","meta":{},"id":"document:document","typeName":"document"},"page:1":{"meta":{},"id":"page:4erp5FF7mts21Njur5UKw","name":"Page 1","index":"a1","typeName":"page"},"shape:_-1kyVBGSUAeNrcxiGAbw":{"x":147.90625,"y":252.66796875,"rotation":0,"isLocked":false,"opacity":1,"meta":{},"id":"shape:_-1kyVBGSUAeNrcxiGAbw","type":"geo","props":{"w":80,"h":80,"geo":"rectangle","color":"black","labelColor":"black","fill":"none","dash":"dotted","size":"l","font":"draw","text":"","align":"middle","verticalAlign":"middle","growY":0,"url":""},"parentId":"page:4erp5FF7mts21Njur5UKw","index":"a1","typeName":"shape"},"shape:kXmGpjXqyzlg1savamgn8":{"x":320,"y":160,"rotation":0,"isLocked":false,"opacity":1,"meta":{},"id":"shape:kXmGpjXqyzlg1savamgn8","type":"geo","props":{"w":146.53341161753187,"h":146.53341161753187,"geo":"star","color":"yellow","labelColor":"black","fill":"none","dash":"draw","size":"m","font":"draw","text":"","align":"middle","verticalAlign":"middle","growY":0,"url":""},"parentId":"page:4erp5FF7mts21Njur5UKw","index":"a2","typeName":"shape"},"shape:eYiyZDA7Iwoi16QjTkJUE":{"x":340,"y":420,"rotation":6.09119908946021,"isLocked":false,"opacity":1,"meta":{},"id":"shape:eYiyZDA7Iwoi16QjTkJUE","type":"text","props":{"color":"light-green","size":"xl","w":317.8125,"text":"HELLO DXOS!","font":"mono","autoSize":true,"scale":1,"textAlign":"middle"},"parentId":"page:4erp5FF7mts21Njur5UKw","index":"a4","typeName":"shape"}}',
  ),
};

const createSketch = (content: SerializedStore<TLRecord> = {}) => {
  return createEchoObject(create(SketchType, { canvas: createEchoObject(create(CanvasType, { content })) }));
};

const Story = () => {
  const [sketch, setSketch] = useState<SketchType>(createSketch());

  const handleCreate = () => {
    setSketch(createSketch(data.v2));
  };

  const handleMigrate = async () => {
    const content = await migrateCanvas(data.v1);
    setSketch(createSketch(content));
  };

  return (
    <div className='flex flex-col grow overflow-hidden'>
      <Toolbar.Root classNames='p-2'>
        <Button variant='primary' onClick={handleCreate}>
          Generate
        </Button>
        <Button variant='ghost' onClick={handleMigrate}>
          Load V1 Sample
        </Button>
      </Toolbar.Root>
      <div className='flex grow overflow-hidden'>
        <SketchComponent sketch={sketch} />
      </div>
    </div>
  );
};

export default {
  title: 'plugin-sketch/SketchComponent',
  component: SketchComponent,
  render: Story,
  decorators: [withTheme, FullscreenDecorator()],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {};
