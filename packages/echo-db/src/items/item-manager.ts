//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { Event, trigger } from '@dxos/async';
import { createId } from '@dxos/crypto';
import { EchoEnvelope, FeedWriter, IEchoStream, ItemID, ItemType, mapFeedWriter, PartyKey } from '@dxos/echo-protocol';
import { Model, ModelFactory, ModelMessage, ModelType } from '@dxos/model-factory';
import { createTransform, timed } from '@dxos/util';

import { ResultSet } from '../result';
import { Item } from './item';
import { TimeframeClock } from './timeframe-clock';

const log = debug('dxos:echo:item-manager');

export interface ItemFilter {
  type?: ItemType | ItemType[]
  parent?: ItemID | ItemID[]
}

export interface ItemConstructionOptions {
  itemId: ItemID,
  modelType: ModelType,
  itemType: ItemType | undefined,
  readStream: NodeJS.ReadableStream,
  parentId?: ItemID,
  initialMutations?: ModelMessage<Uint8Array>[],
  modelSnapshot?: Uint8Array,
}

/**
 * Manages the creation and indexing of items.
 */
export class ItemManager {
  private readonly _itemUpdate = new Event<Item<any>>();

  private readonly _debouncedItemUpdate = debounceEvent(this._itemUpdate.discardParameter());

  // Map of active items.
  private readonly _items = new Map<ItemID, Item<any>>();

  // TODO(burdon): Lint issue: Unexpected whitespace between function name and paren
  // Map of item promises (waiting for item construction after genesis message has been written).
  // eslint-disable-next-line func-call-spacing
  private readonly _pendingItems = new Map<ItemID, (item: Item<any>) => void>();

  private readonly _writeStream?: FeedWriter<EchoEnvelope>;

  /**
   * @param partyKey
   * @param modelFactory
   * @param writeStream Outbound `dxos.echo.IEchoEnvelope` mutation stream.
   */
  constructor (
     private readonly _partyKey: PartyKey,
     private readonly _modelFactory: ModelFactory,
     private readonly _timeframeClock: TimeframeClock,
     writeStream?: FeedWriter<EchoEnvelope>
  ) {
    if (writeStream) {
      this._writeStream = mapFeedWriter(message => ({
        ...message,
        timeframe: this._timeframeClock.timeframe
      }), writeStream);
    }
  }

  isModelKnown (modelType: ModelType) {
    return this._modelFactory.hasModel(modelType);
  }

  /**
   * Creates an item and writes the genesis message.
   * @param {ModelType} modelType
   * @param {ItemType} [itemType]
   * @param {ItemID} [parentId]
   */
  @timed(5000)
  async createItem (modelType: ModelType, itemType?: ItemType, parentId?: ItemID, initProps?: any): Promise<Item<any>> {
    assert(this._writeStream);
    assert(modelType);

    if (!this._modelFactory.hasModel(modelType)) {
      throw new Error(`Unknown model: ${modelType}`);
    }

    let mutation: Uint8Array | undefined;
    if (initProps) {
      const meta = this._modelFactory.getModelMeta(modelType);
      if (!meta.getInitMutation) {
        throw new Error('Tried to provide initialization params to a model with no initializer');
      }
      mutation = meta.mutation.encode(await meta.getInitMutation(initProps));
    }

    // Pending until constructed (after genesis block is read from stream).
    const [waitForCreation, callback] = trigger<Item<any>>();

    const itemId = createId();
    this._pendingItems.set(itemId, callback);

    // Write Item Genesis block.
    log('Item Genesis:', itemId);
    await this._writeStream.write({
      itemId,
      genesis: {
        itemType,
        modelType
      },
      itemMutation: parentId ? { parentId } : undefined,
      mutation
    });

    // Unlocked by construct.
    log('Pending Item:', itemId);
    // TODO(burdon): Type trigger.
    return await (waitForCreation as any)();
  }

  /**
   * Constructs an item with the appropriate model.
   * @param itemId
   * @param modelType
   * @param itemType
   * @param readStream - Inbound mutation stream (from multiplexer).
   * @param [parentId] - ItemID of the parent of this Item (optional).
   */
  // TODO(marik-d): Convert params to object.
  @timed(5000)
  async constructItem ({
    itemId,
    modelType,
    itemType,
    readStream,
    parentId,
    initialMutations,
    modelSnapshot
  }: ItemConstructionOptions) {
    assert(itemId);
    assert(modelType);
    assert(readStream);

    const parent = parentId ? this._items.get(parentId) : null;
    if (parentId && !parent) {
      throw new Error(`Missing parent: ${parentId}`);
    }

    // TODO(burdon): Skip genesis message (and subsequent messages) if unknown model. Build map of ignored items.
    if (!this._modelFactory.hasModel(modelType)) {
      throw new Error(`Unknown model: ${modelType}`);
    }
    const modelMeta = this._modelFactory.getModelMeta(modelType);

    //
    // Convert inbound envelope message to model specific mutation.
    //
    const inboundTransform = createTransform<IEchoStream, ModelMessage<unknown>>(async (message: IEchoStream) => {
      const { meta, data: { itemId: mutationItemId, mutation } } = message;
      assert(mutationItemId === itemId);
      assert(mutation);
      return {
        meta,
        mutation: modelMeta.mutation.decode(mutation)
      };
    });

    //
    // Convert model-specific outbound mutation to outbound envelope message.
    //
    const outboundTransform = this._writeStream && mapFeedWriter<unknown, EchoEnvelope>(mutation => ({
      itemId,
      mutation: modelMeta.mutation.encode(mutation)
    }), this._writeStream);

    // Create the model with the outbound stream.
    const model: Model<any> = this._modelFactory.createModel(modelType, itemId, outboundTransform);
    assert(model, `Invalid model: ${modelType}`);

    // Connect the streams.
    readStream.pipe(inboundTransform).pipe(model.processor);

    // Create the Item.
    const item = new Item(this._partyKey, itemId, itemType, modelMeta, model, this._writeStream, parent);
    assert(!this._items.has(itemId));
    this._items.set(itemId, item);
    log('Constructed:', String(item));

    if (modelSnapshot) {
      assert(modelMeta.snapshotCodec, 'Model snapshot provided but the model does not support snapshots.');
      await model.restoreFromSnapshot(modelMeta.snapshotCodec.decode(modelSnapshot));
    }

    if (initialMutations) {
      for (const mutation of initialMutations) {
        await item.model.processMessage(mutation.meta, modelMeta.mutation.decode(mutation.mutation));
      }
    }

    // Notify Item was udpated.
    // TODO(burdon): Update the item directly?
    this._itemUpdate.emit(item);

    // TODO(telackey): Unsubscribe?
    item.subscribe(() => {
      this._itemUpdate.emit(item);
    });

    // Notify pending creates.
    this._pendingItems.get(itemId)?.(item);
    return item;
  }

  /**
   * Retrieves a item from the index.
   * @param itemId
   */
  getItem<M extends Model<any> = any> (itemId: ItemID): Item<M> | undefined {
    return this._items.get(itemId);
  }

  /**
   * Return matching items.
   * @param [filter]
   */
  queryItems <M extends Model<any> = any> (filter: ItemFilter = {}): ResultSet<Item<M>> {
    return new ResultSet(this._debouncedItemUpdate, () => Array.from(this._items.values())
      .filter(item => matchesFilter(item, filter)));
  }
}

function matchesFilter (item: Item<any>, filter: ItemFilter) {
  if (filter.type && (!item.type || !equalsOrIncludes(item.type, filter.type))) {
    return false;
  }
  if (filter.parent && (!item.parent || !equalsOrIncludes(item.parent.id, filter.parent))) {
    return false;
  }

  return true;
}

function equalsOrIncludes<T> (value: T, expected: T | T[]) {
  if (Array.isArray(expected)) {
    return expected.includes(value);
  } else {
    return expected === value;
  }
}

/**
 * Returns a new event that groups all of the updates emitted during single tick into a single event emission.
 */
function debounceEvent (event: Event): Event {
  const debouncedEvent = new Event();

  let firing = false;

  debouncedEvent.addEffect(() => event.on(() => {
    if (!firing) {
      firing = true;
      setTimeout(() => {
        firing = false;
        debouncedEvent.emit();
      }, 0);
    }
  }));

  return debouncedEvent;
}
