//
// Copyright 2022 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import { Party } from '@dxos/client';
import { Item } from '@dxos/echo-db';
import { FullScreen, Grid, SVG, SVGContextProvider, Zoom } from '@dxos/gem-core';
import { Graph, GraphBuilder, GraphNode } from '@dxos/gem-spore';
import { ObjectModel } from '@dxos/object-model';
import { ClientProvider, ProfileInitializer, useClient, useParty, useSelection } from '@dxos/react-client';

export default {
  title: 'demos/Graph'
};

// TODO(burdon): Generator (org, projects, etc.)
// TODO(burdon): Devtools mesh.
// TODO(burdon): createItem defaults.
// TODO(burdon): useSelection ?? [] (create default).

const useGraphModel = (party?: Party) => {
  const model = useMemo(() => new GraphBuilder<Item<ObjectModel>>(), []);
  const items = useSelection(party?.select().filter((item) => {
    return item.type === 'example:type.org' || item.type === 'example:type.project';
  }), [party]);
  useEffect(() => {
    // TODO(burdon): Batch mode.
    items?.forEach(item => model.addNode({
      id: item.id,
      data: item
    }));

    // TODO(burdon): Idempotent.
    items?.forEach(item => {
      if (item.parent) {
        model.createLink(model.getNode(item.id)!, model.getNode(item.parent.id)!);
      }
    });
  }, [items]);

  return model;
};

const App = () => {
  const client = useClient();
  const [party, setParty] = useState<Party>();
  const model = useGraphModel(party);
  useEffect(() => {
    setImmediate(async () => {
      const party = await client.echo.createParty();
      const item1 = await party.database.createItem({
        model: ObjectModel, // TODO(burdon): Default.
        type: 'example:type.org',
        props: { // TODO(burdon): Properties.
          title: 'DXOS'
        }
      });
      const item2 = await party.database.createItem({
        model: ObjectModel,
        type: 'example:type.project',
        parent: item1.id,
        props: {
          title: 'ECHO'
        }
      });
      const item3 = await party.database.createItem({
        model: ObjectModel,
        type: 'example:type.project',
        parent: item1.id,
        props: {
          title: 'HALO'
        }
      });
      const item4 = await party.database.createItem({
        model: ObjectModel,
        type: 'example:type.project',
        parent: item1.id,
        props: {
          title: 'MESH'
        }
      });

      setParty(party);
    });
  }, []);

  // TODO(burdon): Drag bug.

  return (
    <FullScreen>
      <SVGContextProvider>
        <SVG>
          <Grid axis />
          <Zoom>
            <Graph
              arrows
              drag
              label={(node: GraphNode<Item<ObjectModel>>) => node.data?.model.getProperty('title')}
              model={model}
            />
          </Zoom>
        </SVG>
      </SVGContextProvider>
    </FullScreen>
  );
};

export const Primary = () => {
  return (
    <ClientProvider config={{}}>
      <ProfileInitializer>
        <App />
      </ProfileInitializer>
    </ClientProvider>
  );
};
