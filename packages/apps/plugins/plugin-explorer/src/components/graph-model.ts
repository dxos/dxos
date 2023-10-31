//
// Copyright 2023 DXOS.org
//

import { type Subscription, type Space, type TypedObject, Schema } from '@dxos/client/echo';
import { type GraphData, type GraphLink, GraphModel } from '@dxos/gem-spore';

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

  open(space: Space) {
    if (!this._subscription) {
      const query = space.db.query();
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
            links.push({
              id: `${object.id}-${object.__schema.id}`,
              source: object.id,
              target: object.__schema.id,
            });

            // Parse schema to follow referenced objects.
            object.__schema.props.forEach((prop) => {
              if (prop.type === Schema.PropType.REF) {
                const ref = object[prop.id!];
                if (ref) {
                  if (objects.findIndex((obj) => obj.id === ref.id) !== -1) {
                    links.push({
                      id: `${object.id}-${prop.id}-${ref.id}`,
                      source: object.id,
                      target: ref.id,
                    });
                  }
                }
              }
            });
          }

          return links;
        }, []);

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
