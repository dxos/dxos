//
// Copyright 2024 DXOS.org
//

import { Resource } from '@dxos/context';
import { type Database } from '@dxos/echo';
import { type DatabaseImpl, type EchoClient } from '@dxos/echo-client';
import { invariant } from '@dxos/invariant';
import { type SpaceId, PublicKey } from '@dxos/keys';

import type { ServiceContainer } from './internal';
import { type QueuesAPI, QueuesAPIImpl } from './queues-api';

/**
 * @deprecated
 */
export class SpaceProxy extends Resource {
  private _db?: DatabaseImpl = undefined;
  private _queuesApi: QueuesAPIImpl;

  constructor(
    private readonly _serviceContainer: ServiceContainer,
    private readonly _echoClient: EchoClient,
    private readonly _id: SpaceId,
  ) {
    super();
    this._queuesApi = new QueuesAPIImpl(this._serviceContainer, this._id);
  }

  get id(): SpaceId {
    return this._id;
  }

  get db(): Database.Database {
    invariant(this._db);
    return this._db;
  }

  get queues(): QueuesAPI {
    return this._queuesApi;
  }

  protected override async _open() {
    const meta = await this._serviceContainer.getSpaceMeta(this._id);
    if (!meta) {
      throw new Error(`Space not found: ${this._id}`);
    }

    this._db = this._echoClient.constructDatabase({
      spaceId: this._id,
      spaceKey: PublicKey.from(meta.spaceKey),
      reactiveSchemaQuery: false,
      owningObject: this,
    });

    await this._db.setSpaceRoot(meta.rootDocumentId);
    await this._db.open(this._ctx);
  }
}
