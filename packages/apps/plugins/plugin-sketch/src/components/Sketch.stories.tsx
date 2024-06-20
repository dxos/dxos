//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { useState } from 'react';

import { CanvasType, SketchType } from '@braneframe/types';
import { create } from '@dxos/echo-schema';
import { createEchoObject } from '@dxos/react-client/echo';
import { FullscreenDecorator } from '@dxos/react-client/testing';
import { Button, Toolbar } from '@dxos/react-ui';
import { withTheme } from '@dxos/storybook-utils';

import SketchComponent from './Sketch';

export const sampleV1 = JSON.parse(
  '{"document:document":{"gridSize":10,"name":"","meta":{},"id":"document:document","typeName":"document"},"page:4erp5FF7mts21Njur5UKw":{"meta":{},"id":"page:4erp5FF7mts21Njur5UKw","name":"Page 1","index":"a1","typeName":"page"},"shape:_-1kyVBGSUAeNrcxiGAbw":{"x":147.90625,"y":252.66796875,"rotation":0,"isLocked":false,"opacity":1,"meta":{},"id":"shape:_-1kyVBGSUAeNrcxiGAbw","type":"geo","props":{"w":102.09375,"h":102.09375,"geo":"rectangle","color":"black","labelColor":"black","fill":"none","dash":"dotted","size":"l","font":"draw","text":"","align":"middle","verticalAlign":"middle","growY":0,"url":""},"parentId":"page:4erp5FF7mts21Njur5UKw","index":"a1","typeName":"shape"},"shape:kXmGpjXqyzlg1savamgn8":{"x":390,"y":220,"rotation":0,"isLocked":false,"opacity":1,"meta":{},"id":"shape:kXmGpjXqyzlg1savamgn8","type":"geo","props":{"w":146.53341161753187,"h":146.53341161753187,"geo":"star","color":"yellow","labelColor":"black","fill":"none","dash":"draw","size":"m","font":"draw","text":"","align":"middle","verticalAlign":"middle","growY":0,"url":""},"parentId":"page:4erp5FF7mts21Njur5UKw","index":"a2","typeName":"shape"},"shape:F_o1eH6pS_ABcU3-JPadv":{"x":196.6484375,"y":312.359375,"rotation":0,"isLocked":false,"opacity":1,"meta":{},"id":"shape:F_o1eH6pS_ABcU3-JPadv","type":"arrow","parentId":"page:4erp5FF7mts21Njur5UKw","index":"a3","props":{"dash":"draw","size":"s","fill":"none","color":"blue","labelColor":"black","bend":-118.87115471648073,"start":{"type":"binding","boundShapeId":"shape:_-1kyVBGSUAeNrcxiGAbw","normalizedAnchor":{"x":0.5,"y":0.5},"isExact":false},"end":{"type":"binding","boundShapeId":"shape:kXmGpjXqyzlg1savamgn8","normalizedAnchor":{"x":0.5,"y":0.5},"isExact":false},"arrowheadStart":"none","arrowheadEnd":"arrow","text":"","font":"draw"},"typeName":"shape"},"shape:eYiyZDA7Iwoi16QjTkJUE":{"x":340,"y":420,"rotation":6.09119908946021,"isLocked":false,"opacity":1,"meta":{},"id":"shape:eYiyZDA7Iwoi16QjTkJUE","type":"text","props":{"color":"light-green","size":"xl","w":317.8125,"text":"HELLO WORLD!","font":"mono","align":"middle","autoSize":true,"scale":1},"parentId":"page:4erp5FF7mts21Njur5UKw","index":"a4","typeName":"shape"}}',
);

console.log(JSON.stringify(sampleV1, undefined, 2));

const createSketch = () => {
  return createEchoObject(
    create(SketchType, {
      canvas: createEchoObject(
        create(CanvasType, {
          content: {
            'document:document': {
              name: 'Document',
            },
          },
        }),
      ),
    }),
  );
};

const Story = () => {
  const [sketch, setSketch] = useState<SketchType>(createSketch());

  return (
    <div className='flex flex-col grow overflow-hidden'>
      <Toolbar.Root classNames='p-2'>
        <Button variant='primary' onClick={() => setSketch(createSketch())}>
          Generate
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
