//
// Copyright 2023 DXOS.org
//

import { type GraphData, type GraphLink, GraphModel } from '@dxos/gem-spore';
import { log } from '@dxos/log';
import { type Subscription, type Space, type TypedObject, Schema } from '@dxos/react-client/echo';

export type SpaceGraphModelOptions = {
  schema?: boolean;
};

/**
 * Converts ECHO objects to a graph.
 */
export class SpaceGraphModel extends GraphModel<TypedObject> {
  private readonly _graph: GraphData<TypedObject> = {
    nodes: [],
    links: [],
  };

  private _subscription?: Subscription;
  private _objects?: TypedObject[];

  constructor(private readonly _options: SpaceGraphModelOptions = {}) {
    super();
  }

  override get graph(): GraphData<TypedObject> {
    return this._graph;
  }

  get objects(): TypedObject[] {
    return this._objects ?? [];
  }

  open(space: Space, objectId?: string) {
    if (!this._subscription) {
      // TODO(burdon): Filter.
      const query = space.db.query((object: TypedObject) => object.__typename !== 'braneframe.Folder');

      this._subscription = query.subscribe(({ objects }) => {
        this._objects = objects;
        this._graph.nodes = objects;
        this._graph.links = objects.reduce<GraphLink[]>((links, object) => {
          if (!object.__schema) {
            log.warn('no schema for object:', { id: object.id.slice(0, 8), type: object.__typename });
          }

          if (object.__schema) {
            const idx = objects.findIndex((obj) => obj.id === object.__schema?.id);
            if (idx === -1) {
              this._graph.nodes.push(object.__schema);
            }

            // Link to schema.
            if (this._options.schema) {
              links.push({
                id: `${object.id}-${object.__schema.id}`,
                source: object.id,
                target: object.__schema.id,
              });
            }

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

        this.triggerUpdate();
      }, true);
    }

    this.setSelected(objectId);
    return this;
  }

  close() {
    if (this._subscription) {
      this._subscription();
      this._subscription = undefined;
    }

    return this;
  }
}
