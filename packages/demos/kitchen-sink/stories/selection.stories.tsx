//
// Copyright 2022 DXOS.org
//

import clsx from 'clsx';
import React, { useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/css';

import { Party } from '@dxos/client';
import { Item } from '@dxos/echo-db';
import { FullScreen, Grid, SVG, SVGContextProvider, Zoom } from '@dxos/gem-core';
import { defaultGraphStyles, Graph, GraphBuilder, GraphNode, Markers } from '@dxos/gem-spore';
import { ObjectModel } from '@dxos/object-model';
import { ClientProvider, ProfileInitializer, useClient, useSelection } from '@dxos/react-client';

// Testing.
// import { TestGraphModelAdapter, TestGraphModel, convertTreeToGraph, createTree } from '@dxos/gem-spore';
import { enumFromString, OrgBuilder, ProjectBuilder, TestType, useGenerator } from '../src';

export default {
  title: 'demos/stories'
};

const styles = css`
  g.node {
    &.example_type_org {
      circle {
        fill: orange;
      }
    }
    &.example_type_person {
      circle {
        fill: green;
      }
    }
    &.example_type_project {
      circle {
        fill: cornflowerblue;
      }
    }
    &.example_type_task {
    }
  }
`;

// TODO(burdon): Devtools mesh.
// TODO(burdon): createItem defaults.
// TODO(burdon): useSelection ?? [] (create default).

const useGraphModel = (party?: Party) => {
  const model = useMemo(() => new GraphBuilder<Item<ObjectModel>>(), []);
  const items = useSelection(party?.select().filter((item) => {
    // TODO(burdon): Naturally exclude party item.
    return enumFromString(TestType, item.type!) !== undefined;
  }), [party]);

  useEffect(() => {
    console.log('UPDATE');
    model._graph.nodes = [];
    model._graph.links = [];

    // TODO(burdon): Reset and rebuild.
    // if (model.graph.nodes.length >= 4) {
    //   return;
    // }

    // TODO(burdon): Batch mode.
    items?.forEach(item => model.addNode({
      id: item.id,
      data: item
    }));

    // TODO(burdon): Idempotent.
    // items?.forEach(item => {
    //   if (item.parent) {
    //     model.createLink(model.getNode(item.id)!, model.getNode(item.parent.id)!);
    //   }
    // });

    console.log(model.graph.nodes.length, items?.length)

    model.update();
  }, [items]);

  return model;
};

const App = () => {
  /*
  const model = useMemo(
    () => new TestGraphModelAdapter(new TestGraphModel(convertTreeToGraph(createTree({ depth: 4 })))),
  []);
  */

  const client = useClient();
  const [party, setParty] = useState<Party>();
  const generator = useGenerator(party);
  const model = useGraphModel(party);

  useEffect(() => {
    setImmediate(async () => {
      const party = await client.echo.createParty();
      setParty(party);
    });
  }, []);

  useEffect(() => {
    if (generator) {
      setImmediate(async () => {
        // TODO(burdon): Adapter to create graph.
        await generator.createOrgs([2, 3], async (orgBuilder: OrgBuilder) => {
          await orgBuilder.createPeople([2, 5]);
          await orgBuilder.createProjects([2, 4], async (projectBuilder: ProjectBuilder) => {
            const { result: people } = await orgBuilder.org
              .select()
              .children()
              .filter({ type: TestType.Person })
              .query();

            await projectBuilder.createTasks([2, 5], people);
          });
        });
      }, []);
    }
  }, [generator]);

  return (
    <FullScreen>
      <SVGContextProvider>
        <SVG>
          <Markers />
          <Grid axis />
          <Zoom>
            <Graph
              className={clsx(defaultGraphStyles, styles)}
              arrows
              drag
              model={model}
              forces={{
                manyBody: {
                  distanceMax: 300
                },
                center: {
                  strength: 0.1
                },
                // x: {
                //   strength: 0.05
                // },
                // y: {
                //   strength: 0.05
                // }
              }}
              classes={{
                node: (node: GraphNode<Item<ObjectModel>>) => node.data!.type!.replaceAll(/\W/g, '_')
              }}
              labels={{
                text: (node: GraphNode<Item<ObjectModel>>, highlight) =>
                  highlight ? node.data!.model.getProperty('title') : undefined
              }}
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
