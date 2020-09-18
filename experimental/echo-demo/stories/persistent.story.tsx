//
// Copyright 2020 DXOS.org
//

import { createId } from '@dxos/crypto';
import { Database } from '@dxos/experimental-echo-db';
import { FullScreen, Grid, SVG, useGrid } from '@dxos/gem-core';
import { Markers } from '@dxos/gem-spore';
import React, { useEffect, useState } from 'react';
import useResizeAware from 'react-resize-aware';
import { EchoContext, EchoGraph } from '../src';
import { createDatabase } from '../src/database';
import { createStorage } from '@dxos/random-access-multi-storage';
import leveljs from 'level-js';

export default {
  title: 'Demo',
  decorators: []
};

export const withPersistent = () => {
  const [id] = useState(createId())
  const [database, setDatabase] = useState<Database>()
  useEffect(() => {
    setImmediate(async () => {
      const database = await createDatabase({
        storage: createStorage('dxos/echo-demo'),
        keyStorage: leveljs('dxos/echo-demo/keystore'),
      });
      console.log('Created:', String(database));
      setDatabase(database)
    });
  }, []);

  const [resizeListener, size] = useResizeAware();
  const { width, height } = size;
  const grid = useGrid({ width, height });
  const radius = Math.min(grid.size.width, grid.size.height) / 3;


  return (
    <FullScreen>
      {resizeListener}

      <SVG width={width} height={height}>
        <Grid grid={grid} />

        <Markers />

        {database  && <EchoContext.Provider key={id} value={{ database }}>
          <EchoGraph
            id={id}
            grid={grid}
            delta={{ x: 0, y: 0 }}
            radius={radius}
            onSelect={node => {/*node.type === 'party' && handleInvite(peer, node)*/}}
          />
        </EchoContext.Provider>}
      </SVG>
    </FullScreen>
  );
}
