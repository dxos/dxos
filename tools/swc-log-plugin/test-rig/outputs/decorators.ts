//
// Copyright 2025 DXOS.org
//
// @ts-nocheck
function _ts_decorate(decorators, target, key, desc) {
  var c = arguments.length,
    r = c < 3 ? target : desc === null ? (desc = Object.getOwnPropertyDescriptor(target, key)) : desc,
    d;
  if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
    r = Reflect.decorate(decorators, target, key, desc);
  else
    for (var i = decorators.length - 1; i >= 0; i--)
      if ((d = decorators[i])) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return (c > 3 && r && Object.defineProperty(target, key, r), r);
}
var __dxlog_file = 'decorators.ts';
import { raise } from '@dxos/debug';
import { Filter } from '@dxos/echo-db';
import { getSchema, getSchemaTypename, StoredSchema, toJsonSchema } from '@dxos/echo/internal';
import { log } from '@dxos/log';
import { formatInferredRelationshipLabel, formatNodeLabel, isReference } from './schema';
// 6
export class EchoDataSource {
  _db;
  constructor(_db) {
    this._db = _db;
  }
  async getNodes({ label }) {
    if (!label) {
      const { objects } = await this._db.query(Filter.everything()).run();
      return objects.map(this._objectToNode);
    }
    const schema = (await this._getAllSchema()).find((schema) => getSchemaTypename(schema)?.endsWith(label));
    if (!schema) {
      return [];
    }
    const { objects } = await this._db.query(Filter.type(schema)).run();
    return objects.map(this._objectToNode);
  }
  async getRelationships({ label }) {
    log(
      'getRelationships',
      {
        label,
      },
      {
        F: __dxlog_file,
        L: 39,
        S: this,
        C: (f, a) => f(...a),
      },
    );
    const syntheticRefRelationships = (await this._getAllSchema())
      .filter((schema) => getSchemaTypename(schema) !== StoredSchema.typename)
      .flatMap((schema) => {
        const jsonSchema = toJsonSchema(schema);
        const relationships = Object.entries(jsonSchema.properties).filter(([key, prop]) => isReference(prop));
        return relationships.map(([key, value]) => {
          const relationshipLabel = formatInferredRelationshipLabel(
            jsonSchema.typename ?? raise(new Error('Schema must have typename')),
            key,
          );
          return {
            label: relationshipLabel,
            schema,
            property: key,
          };
        });
      });
    const relationship = syntheticRefRelationships.find((r) => r.label === label);
    if (!relationship) {
      return []; // TODO(dmaretskyi): Handle real relationships.
    }
    const { objects } = await this._db.query(Filter.type(relationship.schema)).run();
    return (
      await Promise.all(objects.map((object) => this._projectRefRelationship(object, relationship.property)))
    ).flat();
  }
  async _getAllSchema() {
    return [
      ...(await this._db.schemaRegistry.query().run()),
      // TODO(dmaretskyi): Remove once we can serialize recursive schema.
      ...this._db.graph.schemaRegistry.schemas.filter((schema) => getSchemaTypename(schema)?.startsWith('example.org')),
    ].filter((schema) => getSchemaTypename(schema) !== StoredSchema.typename);
  }
  _objectToNode(object) {
    const { id, ...properties } = object;
    return {
      id,
      kind: 'node',
      label: formatNodeLabel(getSchemaTypename(getSchema(object))),
      properties,
    };
  }
  async _projectRefRelationship(object, prop) {
    if (!object[prop]) {
      return [];
    }
    const value = Array.isArray(object[prop]) ? object[prop] : [object[prop]];
    return Promise.all(
      value.map(async (ref) => {
        const target = await ref.load();
        return {
          id: `${object.id}-${prop}-${target.id}`,
          kind: 'relationship',
          label: formatInferredRelationshipLabel(getSchemaTypename(getSchema(object)), prop),
          properties: {},
          source: this._objectToNode(object),
          target: this._objectToNode(target),
        };
      }),
    );
  }
}
_ts_decorate(
  [
    log.method(void 0, void 0, {
      F: __dxlog_file,
      L: 0,
      S: this,
      C: (f, a) => f(...a),
    }),
  ],
  EchoDataSource.prototype,
  'getNodes',
  null,
);
_ts_decorate(
  [
    log.method(void 0, void 0, {
      F: __dxlog_file,
      L: 0,
      S: this,
      C: (f, a) => f(...a),
    }),
  ],
  EchoDataSource.prototype,
  'getRelationships',
  null,
);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImRlY29yYXRvcnMudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy9cbi8vIENvcHlyaWdodCAyMDI1IERYT1Mub3JnXG4vL1xuXG4vLyBAdHMtbm9jaGVja1xuaW1wb3J0IHsgdHlwZSBTY2hlbWEgfSBmcm9tICdlZmZlY3QnO1xuXG5pbXBvcnQgeyByYWlzZSB9IGZyb20gJ0BkeG9zL2RlYnVnJztcbmltcG9ydCB7IHR5cGUgRWNob0RhdGFiYXNlLCBGaWx0ZXIsIHR5cGUgQW55TGl2ZU9iamVjdCB9IGZyb20gJ0BkeG9zL2VjaG8tZGInO1xuaW1wb3J0IHsgZ2V0U2NoZW1hLCBnZXRTY2hlbWFUeXBlbmFtZSwgU3RvcmVkU2NoZW1hLCB0b0pzb25TY2hlbWEgfSBmcm9tICdAZHhvcy9lY2hvLXNjaGVtYSc7XG5pbXBvcnQgeyBsb2cgfSBmcm9tICdAZHhvcy9sb2cnO1xuXG5pbXBvcnQgdHlwZSB7IERhdGFTb3VyY2UsIE5vZGUsIFJlbGF0aW9uc2hpcCB9IGZyb20gJy4vcXVlcnktZXhlY3V0b3InO1xuaW1wb3J0IHsgZm9ybWF0SW5mZXJyZWRSZWxhdGlvbnNoaXBMYWJlbCwgZm9ybWF0Tm9kZUxhYmVsLCBpc1JlZmVyZW5jZSB9IGZyb20gJy4vc2NoZW1hJztcblxuLy8gNlxuXG5leHBvcnQgY2xhc3MgRWNob0RhdGFTb3VyY2UgaW1wbGVtZW50cyBEYXRhU291cmNlIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBfZGI6IEVjaG9EYXRhYmFzZSkge31cblxuICBAbG9nLm1ldGhvZCgpXG4gIGFzeW5jIGdldE5vZGVzKHsgbGFiZWwgfTogeyBsYWJlbD86IHN0cmluZyB9KTogUHJvbWlzZTxOb2RlW10+IHtcbiAgICBpZiAoIWxhYmVsKSB7XG4gICAgICBjb25zdCB7IG9iamVjdHMgfSA9IGF3YWl0IHRoaXMuX2RiLnF1ZXJ5KEZpbHRlci5ldmVyeXRoaW5nKCkpLnJ1bigpO1xuICAgICAgcmV0dXJuIG9iamVjdHMubWFwKHRoaXMuX29iamVjdFRvTm9kZSk7XG4gICAgfVxuXG4gICAgY29uc3Qgc2NoZW1hID0gKGF3YWl0IHRoaXMuX2dldEFsbFNjaGVtYSgpKS5maW5kKChzY2hlbWEpID0+IGdldFNjaGVtYVR5cGVuYW1lKHNjaGVtYSk/LmVuZHNXaXRoKGxhYmVsKSk7XG4gICAgaWYgKCFzY2hlbWEpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBjb25zdCB7IG9iamVjdHMgfSA9IGF3YWl0IHRoaXMuX2RiLnF1ZXJ5KEZpbHRlci50eXBlKHNjaGVtYSkpLnJ1bigpO1xuICAgIHJldHVybiBvYmplY3RzLm1hcCh0aGlzLl9vYmplY3RUb05vZGUpO1xuICB9XG5cbiAgQGxvZy5tZXRob2QoKVxuICBhc3luYyBnZXRSZWxhdGlvbnNoaXBzKHsgbGFiZWwgfTogeyBsYWJlbD86IHN0cmluZyB9KTogUHJvbWlzZTxSZWxhdGlvbnNoaXBbXT4ge1xuICAgIGxvZygnZ2V0UmVsYXRpb25zaGlwcycsIHsgbGFiZWwgfSk7XG5cbiAgICBjb25zdCBzeW50aGV0aWNSZWZSZWxhdGlvbnNoaXBzID0gKGF3YWl0IHRoaXMuX2dldEFsbFNjaGVtYSgpKVxuICAgICAgLmZpbHRlcigoc2NoZW1hKSA9PiBnZXRTY2hlbWFUeXBlbmFtZShzY2hlbWEpICE9PSBTdG9yZWRTY2hlbWEudHlwZW5hbWUpXG4gICAgICAuZmxhdE1hcCgoc2NoZW1hKSA9PiB7XG4gICAgICAgIGNvbnN0IGpzb25TY2hlbWEgPSB0b0pzb25TY2hlbWEoc2NoZW1hKTtcbiAgICAgICAgY29uc3QgcmVsYXRpb25zaGlwcyA9IE9iamVjdC5lbnRyaWVzKGpzb25TY2hlbWEucHJvcGVydGllcyEpLmZpbHRlcigoW2tleSwgcHJvcF0pID0+IGlzUmVmZXJlbmNlKHByb3ApKTtcblxuICAgICAgICByZXR1cm4gcmVsYXRpb25zaGlwcy5tYXAoKFtrZXksIHZhbHVlXSkgPT4ge1xuICAgICAgICAgIGNvbnN0IHJlbGF0aW9uc2hpcExhYmVsID0gZm9ybWF0SW5mZXJyZWRSZWxhdGlvbnNoaXBMYWJlbChcbiAgICAgICAgICAgIGpzb25TY2hlbWEudHlwZW5hbWUgPz8gcmFpc2UobmV3IEVycm9yKCdTY2hlbWEgbXVzdCBoYXZlIHR5cGVuYW1lJykpLFxuICAgICAgICAgICAga2V5LFxuICAgICAgICAgICk7XG5cbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgbGFiZWw6IHJlbGF0aW9uc2hpcExhYmVsLFxuICAgICAgICAgICAgc2NoZW1hLFxuICAgICAgICAgICAgcHJvcGVydHk6IGtleSxcbiAgICAgICAgICB9O1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIGNvbnN0IHJlbGF0aW9uc2hpcCA9IHN5bnRoZXRpY1JlZlJlbGF0aW9uc2hpcHMuZmluZCgocikgPT4gci5sYWJlbCA9PT0gbGFiZWwpO1xuICAgIGlmICghcmVsYXRpb25zaGlwKSB7XG4gICAgICByZXR1cm4gW107IC8vIFRPRE8oZG1hcmV0c2t5aSk6IEhhbmRsZSByZWFsIHJlbGF0aW9uc2hpcHMuXG4gICAgfVxuXG4gICAgY29uc3QgeyBvYmplY3RzIH0gPSBhd2FpdCB0aGlzLl9kYi5xdWVyeShGaWx0ZXIudHlwZShyZWxhdGlvbnNoaXAuc2NoZW1hKSkucnVuKCk7XG4gICAgcmV0dXJuIChcbiAgICAgIGF3YWl0IFByb21pc2UuYWxsKG9iamVjdHMubWFwKChvYmplY3QpID0+IHRoaXMuX3Byb2plY3RSZWZSZWxhdGlvbnNoaXAob2JqZWN0LCByZWxhdGlvbnNoaXAucHJvcGVydHkpKSlcbiAgICApLmZsYXQoKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgX2dldEFsbFNjaGVtYSgpOiBQcm9taXNlPFNjaGVtYS5TY2hlbWEuQW55Tm9Db250ZXh0W10+IHtcbiAgICByZXR1cm4gW1xuICAgICAgLi4uKGF3YWl0IHRoaXMuX2RiLnNjaGVtYVJlZ2lzdHJ5LnF1ZXJ5KCkucnVuKCkpLFxuICAgICAgLy8gVE9ETyhkbWFyZXRza3lpKTogUmVtb3ZlIG9uY2Ugd2UgY2FuIHNlcmlhbGl6ZSByZWN1cnNpdmUgc2NoZW1hLlxuICAgICAgLi4udGhpcy5fZGIuZ3JhcGguc2NoZW1hUmVnaXN0cnkuc2NoZW1hcy5maWx0ZXIoKHNjaGVtYSkgPT4gZ2V0U2NoZW1hVHlwZW5hbWUoc2NoZW1hKT8uc3RhcnRzV2l0aCgnZXhhbXBsZS5vcmcnKSksXG4gICAgXS5maWx0ZXIoKHNjaGVtYSkgPT4gZ2V0U2NoZW1hVHlwZW5hbWUoc2NoZW1hKSAhPT0gU3RvcmVkU2NoZW1hLnR5cGVuYW1lKTtcbiAgfVxuXG4gIHByaXZhdGUgX29iamVjdFRvTm9kZShvYmplY3Q6IEFueUxpdmVPYmplY3Q8YW55Pik6IE5vZGUge1xuICAgIGNvbnN0IHsgaWQsIC4uLnByb3BlcnRpZXMgfSA9IG9iamVjdDtcbiAgICByZXR1cm4ge1xuICAgICAgaWQsXG4gICAgICBraW5kOiAnbm9kZScsXG4gICAgICBsYWJlbDogZm9ybWF0Tm9kZUxhYmVsKGdldFNjaGVtYVR5cGVuYW1lKGdldFNjaGVtYShvYmplY3QpISkhKSxcbiAgICAgIHByb3BlcnRpZXMsXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgX3Byb2plY3RSZWZSZWxhdGlvbnNoaXAob2JqZWN0OiBBbnlMaXZlT2JqZWN0PGFueT4sIHByb3A6IHN0cmluZyk6IFByb21pc2U8UmVsYXRpb25zaGlwW10+IHtcbiAgICBpZiAoIW9iamVjdFtwcm9wXSkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGNvbnN0IHZhbHVlID0gQXJyYXkuaXNBcnJheShvYmplY3RbcHJvcF0pID8gb2JqZWN0W3Byb3BdIDogW29iamVjdFtwcm9wXV07XG5cbiAgICByZXR1cm4gUHJvbWlzZS5hbGwoXG4gICAgICB2YWx1ZS5tYXAoYXN5bmMgKHJlZik6IFByb21pc2U8UmVsYXRpb25zaGlwPiA9PiB7XG4gICAgICAgIGNvbnN0IHRhcmdldCA9IGF3YWl0IHJlZi5sb2FkKCk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgaWQ6IGAke29iamVjdC5pZH0tJHtwcm9wfS0ke3RhcmdldC5pZH1gLFxuICAgICAgICAgIGtpbmQ6ICdyZWxhdGlvbnNoaXAnLFxuICAgICAgICAgIGxhYmVsOiBmb3JtYXRJbmZlcnJlZFJlbGF0aW9uc2hpcExhYmVsKGdldFNjaGVtYVR5cGVuYW1lKGdldFNjaGVtYShvYmplY3QpISkhLCBwcm9wKSxcbiAgICAgICAgICBwcm9wZXJ0aWVzOiB7fSxcbiAgICAgICAgICBzb3VyY2U6IHRoaXMuX29iamVjdFRvTm9kZShvYmplY3QpLFxuICAgICAgICAgIHRhcmdldDogdGhpcy5fb2JqZWN0VG9Ob2RlKHRhcmdldCksXG4gICAgICAgIH07XG4gICAgICB9KSxcbiAgICApO1xuICB9XG59XG4iXSwibmFtZXMiOlsicmFpc2UiLCJGaWx0ZXIiLCJnZXRTY2hlbWEiLCJnZXRTY2hlbWFUeXBlbmFtZSIsIlN0b3JlZFNjaGVtYSIsInRvSnNvblNjaGVtYSIsImxvZyIsImZvcm1hdEluZmVycmVkUmVsYXRpb25zaGlwTGFiZWwiLCJmb3JtYXROb2RlTGFiZWwiLCJpc1JlZmVyZW5jZSIsIkVjaG9EYXRhU291cmNlIiwiX2RiIiwiZ2V0Tm9kZXMiLCJsYWJlbCIsIm9iamVjdHMiLCJxdWVyeSIsImV2ZXJ5dGhpbmciLCJydW4iLCJtYXAiLCJfb2JqZWN0VG9Ob2RlIiwic2NoZW1hIiwiX2dldEFsbFNjaGVtYSIsImZpbmQiLCJlbmRzV2l0aCIsInR5cGUiLCJnZXRSZWxhdGlvbnNoaXBzIiwic3ludGhldGljUmVmUmVsYXRpb25zaGlwcyIsImZpbHRlciIsInR5cGVuYW1lIiwiZmxhdE1hcCIsImpzb25TY2hlbWEiLCJyZWxhdGlvbnNoaXBzIiwiT2JqZWN0IiwiZW50cmllcyIsInByb3BlcnRpZXMiLCJrZXkiLCJwcm9wIiwidmFsdWUiLCJyZWxhdGlvbnNoaXBMYWJlbCIsIkVycm9yIiwicHJvcGVydHkiLCJyZWxhdGlvbnNoaXAiLCJyIiwiUHJvbWlzZSIsImFsbCIsIm9iamVjdCIsIl9wcm9qZWN0UmVmUmVsYXRpb25zaGlwIiwiZmxhdCIsInNjaGVtYVJlZ2lzdHJ5IiwiZ3JhcGgiLCJzY2hlbWFzIiwic3RhcnRzV2l0aCIsImlkIiwia2luZCIsIkFycmF5IiwiaXNBcnJheSIsInJlZiIsInRhcmdldCIsImxvYWQiLCJzb3VyY2UiLCJtZXRob2QiXSwibWFwcGluZ3MiOiJBQUFBLEVBQUU7QUFDRiwwQkFBMEI7QUFDMUIsRUFBRTtBQUVGLGNBQWM7Ozs7Ozs7O0FBR2QsU0FBU0EsS0FBSyxRQUFRLGNBQWM7QUFDcEMsU0FBNEJDLE1BQU0sUUFBNEIsZ0JBQWdCO0FBQzlFLFNBQVNDLFNBQVMsRUFBRUMsaUJBQWlCLEVBQUVDLFlBQVksRUFBRUMsWUFBWSxRQUFRLG9CQUFvQjtBQUM3RixTQUFTQyxHQUFHLFFBQVEsWUFBWTtBQUdoQyxTQUFTQywrQkFBK0IsRUFBRUMsZUFBZSxFQUFFQyxXQUFXLFFBQVEsV0FBVztBQUV6RixJQUFJO0FBRUosT0FBTyxNQUFNQzs7SUFDWCxZQUFZLEFBQWlCQyxHQUFpQixDQUFFO2FBQW5CQSxNQUFBQTtJQUFvQjtJQUVqRCxNQUNNQyxTQUFTLEVBQUVDLEtBQUssRUFBc0IsRUFBbUI7UUFDN0QsSUFBSSxDQUFDQSxPQUFPO1lBQ1YsTUFBTSxFQUFFQyxPQUFPLEVBQUUsR0FBRyxNQUFNLElBQUksQ0FBQ0gsR0FBRyxDQUFDSSxLQUFLLENBQUNkLE9BQU9lLFVBQVUsSUFBSUMsR0FBRztZQUNqRSxPQUFPSCxRQUFRSSxHQUFHLENBQUMsSUFBSSxDQUFDQyxhQUFhO1FBQ3ZDO1FBRUEsTUFBTUMsU0FBUyxBQUFDLENBQUEsTUFBTSxJQUFJLENBQUNDLGFBQWEsRUFBQyxFQUFHQyxJQUFJLENBQUMsQ0FBQ0YsU0FBV2pCLGtCQUFrQmlCLFNBQVNHLFNBQVNWO1FBQ2pHLElBQUksQ0FBQ08sUUFBUTtZQUNYLE9BQU8sRUFBRTtRQUNYO1FBRUEsTUFBTSxFQUFFTixPQUFPLEVBQUUsR0FBRyxNQUFNLElBQUksQ0FBQ0gsR0FBRyxDQUFDSSxLQUFLLENBQUNkLE9BQU91QixJQUFJLENBQUNKLFNBQVNILEdBQUc7UUFDakUsT0FBT0gsUUFBUUksR0FBRyxDQUFDLElBQUksQ0FBQ0MsYUFBYTtJQUN2QztJQUVBLE1BQ01NLGlCQUFpQixFQUFFWixLQUFLLEVBQXNCLEVBQTJCO1FBQzdFUCxJQUFJLG9CQUFvQjtZQUFFTztRQUFNOzs7Ozs7UUFFaEMsTUFBTWEsNEJBQTRCLEFBQUMsQ0FBQSxNQUFNLElBQUksQ0FBQ0wsYUFBYSxFQUFDLEVBQ3pETSxNQUFNLENBQUMsQ0FBQ1AsU0FBV2pCLGtCQUFrQmlCLFlBQVloQixhQUFhd0IsUUFBUSxFQUN0RUMsT0FBTyxDQUFDLENBQUNUO1lBQ1IsTUFBTVUsYUFBYXpCLGFBQWFlO1lBQ2hDLE1BQU1XLGdCQUFnQkMsT0FBT0MsT0FBTyxDQUFDSCxXQUFXSSxVQUFVLEVBQUdQLE1BQU0sQ0FBQyxDQUFDLENBQUNRLEtBQUtDLEtBQUssR0FBSzNCLFlBQVkyQjtZQUVqRyxPQUFPTCxjQUFjYixHQUFHLENBQUMsQ0FBQyxDQUFDaUIsS0FBS0UsTUFBTTtnQkFDcEMsTUFBTUMsb0JBQW9CL0IsZ0NBQ3hCdUIsV0FBV0YsUUFBUSxJQUFJNUIsTUFBTSxJQUFJdUMsTUFBTSwrQkFDdkNKO2dCQUdGLE9BQU87b0JBQ0x0QixPQUFPeUI7b0JBQ1BsQjtvQkFDQW9CLFVBQVVMO2dCQUNaO1lBQ0Y7UUFDRjtRQUNGLE1BQU1NLGVBQWVmLDBCQUEwQkosSUFBSSxDQUFDLENBQUNvQixJQUFNQSxFQUFFN0IsS0FBSyxLQUFLQTtRQUN2RSxJQUFJLENBQUM0QixjQUFjO1lBQ2pCLE9BQU8sRUFBRSxFQUFFLCtDQUErQztRQUM1RDtRQUVBLE1BQU0sRUFBRTNCLE9BQU8sRUFBRSxHQUFHLE1BQU0sSUFBSSxDQUFDSCxHQUFHLENBQUNJLEtBQUssQ0FBQ2QsT0FBT3VCLElBQUksQ0FBQ2lCLGFBQWFyQixNQUFNLEdBQUdILEdBQUc7UUFDOUUsT0FBTyxBQUNMLENBQUEsTUFBTTBCLFFBQVFDLEdBQUcsQ0FBQzlCLFFBQVFJLEdBQUcsQ0FBQyxDQUFDMkIsU0FBVyxJQUFJLENBQUNDLHVCQUF1QixDQUFDRCxRQUFRSixhQUFhRCxRQUFRLEdBQUUsRUFDdEdPLElBQUk7SUFDUjtJQUVBLE1BQWMxQixnQkFBdUQ7UUFDbkUsT0FBTztlQUNELE1BQU0sSUFBSSxDQUFDVixHQUFHLENBQUNxQyxjQUFjLENBQUNqQyxLQUFLLEdBQUdFLEdBQUc7WUFDN0MsbUVBQW1FO2VBQ2hFLElBQUksQ0FBQ04sR0FBRyxDQUFDc0MsS0FBSyxDQUFDRCxjQUFjLENBQUNFLE9BQU8sQ0FBQ3ZCLE1BQU0sQ0FBQyxDQUFDUCxTQUFXakIsa0JBQWtCaUIsU0FBUytCLFdBQVc7U0FDbkcsQ0FBQ3hCLE1BQU0sQ0FBQyxDQUFDUCxTQUFXakIsa0JBQWtCaUIsWUFBWWhCLGFBQWF3QixRQUFRO0lBQzFFO0lBRVFULGNBQWMwQixNQUEwQixFQUFRO1FBQ3RELE1BQU0sRUFBRU8sRUFBRSxFQUFFLEdBQUdsQixZQUFZLEdBQUdXO1FBQzlCLE9BQU87WUFDTE87WUFDQUMsTUFBTTtZQUNOeEMsT0FBT0wsZ0JBQWdCTCxrQkFBa0JELFVBQVUyQztZQUNuRFg7UUFDRjtJQUNGO0lBRUEsTUFBY1ksd0JBQXdCRCxNQUEwQixFQUFFVCxJQUFZLEVBQTJCO1FBQ3ZHLElBQUksQ0FBQ1MsTUFBTSxDQUFDVCxLQUFLLEVBQUU7WUFDakIsT0FBTyxFQUFFO1FBQ1g7UUFFQSxNQUFNQyxRQUFRaUIsTUFBTUMsT0FBTyxDQUFDVixNQUFNLENBQUNULEtBQUssSUFBSVMsTUFBTSxDQUFDVCxLQUFLLEdBQUc7WUFBQ1MsTUFBTSxDQUFDVCxLQUFLO1NBQUM7UUFFekUsT0FBT08sUUFBUUMsR0FBRyxDQUNoQlAsTUFBTW5CLEdBQUcsQ0FBQyxPQUFPc0M7WUFDZixNQUFNQyxTQUFTLE1BQU1ELElBQUlFLElBQUk7WUFDN0IsT0FBTztnQkFDTE4sSUFBSSxHQUFHUCxPQUFPTyxFQUFFLENBQUMsQ0FBQyxFQUFFaEIsS0FBSyxDQUFDLEVBQUVxQixPQUFPTCxFQUFFLEVBQUU7Z0JBQ3ZDQyxNQUFNO2dCQUNOeEMsT0FBT04sZ0NBQWdDSixrQkFBa0JELFVBQVUyQyxVQUFZVDtnQkFDL0VGLFlBQVksQ0FBQztnQkFDYnlCLFFBQVEsSUFBSSxDQUFDeEMsYUFBYSxDQUFDMEI7Z0JBQzNCWSxRQUFRLElBQUksQ0FBQ3RDLGFBQWEsQ0FBQ3NDO1lBQzdCO1FBQ0Y7SUFFSjtBQUNGOztRQXpGT0c7Ozs7Ozs7O1FBZ0JBQSJ9
