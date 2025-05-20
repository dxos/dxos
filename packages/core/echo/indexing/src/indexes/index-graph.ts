//
// Copyright 2024 DXOS.org
//

import { Event } from '@dxos/async';
import { Resource } from '@dxos/context';
import { ObjectStructure } from '@dxos/echo-protocol';
import { EntityKind, ObjectId } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { ObjectPointerEncoded } from '@dxos/protocols';
import { IndexKind } from '@dxos/protocols/proto/dxos/echo/indexing';
import { trace } from '@dxos/tracing';

import { Schema } from 'effect';
import {
  EscapedPropPath,
  type FindResult,
  type Index,
  type IndexQuery,
  type IndexStaticProps,
  type LoadParams,
  staticImplements,
} from '../types';
import { entries } from '@dxos/util';
import { log } from '@dxos/log';

/**
 * Indexes graph relationships between objects.
 * Includes incoming references for relations as well.
 */
@trace.resource()
@staticImplements<IndexStaticProps>()
export class IndexGraph extends Resource implements Index {
  private _identifier = PublicKey.random().toString();
  public readonly kind: IndexKind = { kind: IndexKind.Kind.GRAPH };
  public readonly updated = new Event<void>();

  /**
   * Tracks inbound references for each object.
   *
   * target object id -> prop name -> set of source object ids
   */
  private readonly _inboundReferences = new Map<ObjectId, Map<string, Set<ObjectPointerEncoded>>>();

  /**
   * Tracks relation targets for each object.
   *
   * relation target object id -> set of relation ids
   */
  private readonly _relationTargets = new Map<ObjectId, Set<ObjectPointerEncoded>>();

  /**
   * Tracks relation sources for each object.
   *
   * relation source object id -> set of relation ids
   */
  private readonly _relationSources = new Map<ObjectId, Set<ObjectPointerEncoded>>();

  get identifier() {
    return this._identifier;
  }

  @trace.span({ showInBrowserTimeline: true })
  async update(id: ObjectPointerEncoded, object: Partial<ObjectStructure>): Promise<boolean> {
    const kind = ObjectStructure.getEntityKind(object);
    switch (kind) {
      case EntityKind.Object: {
        break;
      }
      case EntityKind.Relation: {
        break;
      }
      default:
        log.warn('unknown entity kind', { kind });
    }

    throw new Error('Not implemented');

    //   if (this._refs.get(getTypeFromObject(object))?.has(id)) {
    //     return false;
    //   }
    //   defaultMap(this._refs, getTypeFromObject(object), new Set()).add(id);
    //   return true;
  }
  async remove(id: ObjectPointerEncoded) {
    throw new Error('Not implemented');
    // for (const [_, ids] of this._refs.entries()) {
    //   if (ids.has(id)) {
    //     ids.delete(id);
    //     return;
    //   }
    // }
  }

  @trace.span({ showInBrowserTimeline: true })
  async find(filter: IndexQuery): Promise<FindResult[]> {
    if (filter.inverted || filter.typenames.length > 0 || !filter.graph) {
      throw new Error('Invalid filter for graph query');
    }

    const { kind, anchors, property } = filter.graph;

    switch (kind) {
      case 'inbound-reference': {
        const results: FindResult[] = [];
        for (const anchor of anchors) {
          const sources = this._inboundReferences.get(anchor);
          if (!sources) {
            continue;
          }
          if (property !== null) {
            const source = sources.get(property);
            if (!source) {
              continue;
            }
            results.push(...Array.from(source).map((id) => ({ id, rank: 0 })));
          } else {
            for (const source of sources.values()) {
              results.push(...Array.from(source).map((id) => ({ id, rank: 0 })));
            }
          }
        }
        return results;
      }
      case 'relation-source': {
        const results: FindResult[] = [];
        for (const anchor of anchors) {
          const sources = this._relationSources.get(anchor);
          if (!sources) {
            continue;
          }
          results.push(...Array.from(sources).map((id) => ({ id, rank: 0 })));
        }
        return results;
      }
      case 'relation-target': {
        const results: FindResult[] = [];
        for (const anchor of anchors) {
          const sources = this._relationTargets.get(anchor);
          if (!sources) {
            continue;
          }
          results.push(...Array.from(sources).map((id) => ({ id, rank: 0 })));
        }
        return results;
      }
    }
  }

  @trace.span({ showInBrowserTimeline: true })
  async serialize(): Promise<string> {
    const data: GraphIndexData = {
      inboundReferences: Object.fromEntries(
        [...this._inboundReferences.entries()].map(([target, perProp]) => [
          target,
          Object.fromEntries([...perProp.entries()].map(([prop, sources]) => [prop, Array.from(sources)])),
        ]),
      ),
      relationTargets: Object.fromEntries(
        [...this._relationTargets.entries()].map(([target, sources]) => [target, Array.from(sources)]),
      ),
      relationSources: Object.fromEntries(
        [...this._relationSources.entries()].map(([target, sources]) => [target, Array.from(sources)]),
      ),
    };
    return JSON.stringify(data);
  }

  @trace.span({ showInBrowserTimeline: true })
  static async load({ serialized, identifier }: LoadParams): Promise<IndexGraph> {
    const index = new IndexGraph();
    await index.open();

    const data = GraphIndexData.pipe(Schema.decodeUnknownSync)(JSON.parse(serialized));
    index._loadFrom(data);
    return index;
  }

  private _loadFrom(data: GraphIndexData) {
    this._inboundReferences.clear();
    this._relationTargets.clear();
    this._relationSources.clear();

    for (const [target, perProp] of entries(data.inboundReferences)) {
      const propMap = new Map<string, Set<ObjectPointerEncoded>>();
      this._inboundReferences.set(target, propMap);
      for (const [prop, sources] of entries(perProp)) {
        propMap.set(prop, new Set(sources));
      }
    }
  }
}

const GraphIndexData = Schema.Struct({
  inboundReferences: Schema.Record({
    key: ObjectId,
    value: Schema.Record({
      key: EscapedPropPath,
      value: Schema.Array(ObjectPointerEncoded),
    }),
  }),
  relationTargets: Schema.Record({
    key: ObjectId,
    value: Schema.Array(ObjectPointerEncoded),
  }),
  relationSources: Schema.Record({
    key: ObjectId,
    value: Schema.Array(ObjectPointerEncoded),
  }),
});
interface GraphIndexData extends Schema.Schema.Type<typeof GraphIndexData> {}
