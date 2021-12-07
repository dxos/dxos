//
// Copyright 2021 DXOS.org
//

import { Codec } from '@dxos/codec-protobuf';
import { FeedWriter, ItemID } from '@dxos/echo-protocol';

import { Model } from './model';

// TODO(burdon): Copied from braneframe ExperimentalChessModel.stories.tsx

export type DXN = string; // TODO(burdon): Move.

export type StateProcessor<STATE, MUTATION> = (state: STATE, mutation: MUTATION) => void;

// TODO(burdon): Create Item/Model from ItemGenesis proto (discover model, frame, etc.)
//   { ItemID, ItemType, ModelType }
// TODO(burdon): Create Item (Model.getInitMutation?)
// TODO(burdon): Model registration (start-up) and dynamic loading.
// TODO(burdon): Snapshots (incl. reset/rollback).
// TODO(burdon): Readonly/writable models.

// TODO(burdon): The Model is just an API for the state. "Meta" contains other configuration.
export interface ExperimentalModelMeta<STATE, MUTATION, MODEL> {
  type: DXN
  // TODO(burdon): Why "new"?
  model: new (getState: () => STATE, onWrite: (mutation: MUTATION) => void) => MODEL
  initialState: () => STATE
  mutationProcessor: StateProcessor<STATE, MUTATION>
  mutationCodec: Codec<any>
  snapshotCodec?: Codec<any>
  // TODO(burdon): ???
  modelFactory?: (writeStream?: FeedWriter<MUTATION>) => MODEL
}

export abstract class ExperimentalModel<STATE, MUTATION> {
  protected constructor (
    private readonly _writeStream?: FeedWriter<MUTATION>
  ) {}
}

/**
 * New Model signature.
 */
export class ModelAdapter<STATE, MUTATION, MODEL> extends Model<MUTATION>{

  constructor (
    private readonly _meta2: ExperimentalModelMeta<STATE, MUTATION, MODEL>,
    private readonly _state: STATE,
    itemId: ItemID,
    writeStream?: FeedWriter<MUTATION>
  ) {
    super({
      type: _meta2.type,
      mutation: _meta2.mutationCodec,
      snapshotCodec: _meta2.snapshotCodec
    }, itemId, writeStream);
  }

  protected _processMessage (_: any, mutation: MUTATION): Promise<boolean> {
    this._meta2.mutationProcessor(this._state, mutation);
    return Promise.resolve(false);
  }
}
