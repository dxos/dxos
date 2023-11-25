//
// Copyright 2023 DXOS.org
//

import { type GraphData, type GraphLink, GraphModel } from '@dxos/gem-spore';
import { type Subscription, type Space, type TypedObject, Schema } from '@dxos/react-client/echo';

/**
 * Converts ECHO objects to a graph.
 */
export class EchoGraphModel extends GraphModel<TypedObject> {
  private _graph: GraphData<TypedObject> = {
    nodes: [],
    links: [],
  };

  private _subscription?: Subscription;
  private _objects?: TypedObject[];

  get objects(): TypedObject[] {
    return this._objects ?? [];
  }

  // TODO(burdon): Create dge bundling graph using d3.hierarchy.
  // https://observablehq.com/@d3/hierarchical-edge-bundling?intent=fork

  open(space: Space) {
    if (!this._subscription) {
      // TODO(burdon): Filter.
      const query = space.db.query((object) => object.__typename !== 'braneframe.Folder');

      this._subscription = query.subscribe(({ objects }) => {
        this._objects = objects;
        this._graph.nodes = objects;
        this._graph.links = objects.reduce<GraphLink[]>((links, object) => {
          if (object.__schema) {
            const idx = objects.findIndex((obj) => obj.id === object.__schema?.id);
            if (idx === -1) {
              this._graph.nodes.push(object.__schema);
            }

            // Link to schema.
            // TODO(burdon): Configure.
            links.push({
              id: `${object.id}-${object.__schema.id}`,
              source: object.id,
              target: object.__schema.id,
            });

            // Parse schema to follow referenced objects.
            object.__schema.props.forEach((prop) => {
              switch (prop.type) {
                case Schema.PropType.RECORD: {
                  break;
                }

                case Schema.PropType.REF: {
                  const value = object[prop.id!];
                  if (value) {
                    const refs = prop.repeated ? value : [value];
                    for (const ref of refs) {
                      if (objects.findIndex((obj) => obj.id === ref.id) !== -1) {
                        links.push({
                          id: `${object.id}-${prop.id}-${ref.id}`,
                          source: object.id,
                          target: ref.id,
                        });
                      }
                    }
                  }
                  break;
                }
              }
            });
          }

          return links;
        }, []);

        // console.log('graph', { nodes: this._graph.nodes.length, links: this._graph.links.length });

        this.triggerUpdate();
      }, true);
    }

    return this;
  }

  close() {
    if (this._subscription) {
      this._subscription();
      this._subscription = undefined;
    }

    return this;
  }

  override get graph(): GraphData<TypedObject> {
    return this._graph;
  }
}
