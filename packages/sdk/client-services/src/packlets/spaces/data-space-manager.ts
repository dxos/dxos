import { Event, synchronized } from "@dxos/async";
import { AcceptSpaceOptions, DataServiceSubscriptions, MetadataStore, SigningContext, SpaceManager } from "@dxos/echo-db";
import { spaceGenesis } from "@dxos/echo-db";
import { Keyring } from "@dxos/keyring";
import { PublicKey } from "@dxos/keys";
import { log } from "@dxos/log";
import { SpaceMetadata } from "@dxos/protocols/proto/dxos/echo/metadata";
import { ComplexMap } from "@dxos/util";
import { DataSpace } from "./data-space";

export class DataSpaceManager {
  public readonly updated = new Event();

  private readonly _spaces = new ComplexMap<PublicKey, DataSpace>(PublicKey.hash);

  constructor(
    private readonly _spaceManager: SpaceManager,
    private readonly _metadataStore: MetadataStore,
    private readonly _dataServiceSubscriptions: DataServiceSubscriptions,
    private readonly _keyring: Keyring,
    private readonly _signingContext: SigningContext,
  ) { }

  // TODO(burdon): Remove.
  get spaces() {
    return this._spaces;
  }

  @synchronized
  async open() {
    await this._metadataStore.load();

    for (const spaceMetadata of this._metadataStore.spaces) {
      const space = await this._spaceManager.constructSpace({
        metadata: spaceMetadata,
        swarmIdentity: {
          peerKey: this._signingContext.deviceKey,
          credentialProvider: this._signingContext.credentialProvider,
          credentialAuthenticator: this._signingContext.credentialAuthenticator
        }
      });
      const dataSpace = new DataSpace(space);
      this._dataServiceSubscriptions.registerSpace(space.key, space.database!.createDataServiceHost());
      this._spaces.set(spaceMetadata.key, dataSpace);
    }
  }

  @synchronized
  async close() {

  }

  /**
   * Creates a new space writing the genesis credentials to the control feed.
   */
  async createSpace() {
    const spaceKey = await this._keyring.createKey();
    const controlFeedKey = await this._keyring.createKey();
    const dataFeedKey = await this._keyring.createKey();
    const metadata: SpaceMetadata = {
      key: spaceKey,
      genesisFeedKey: controlFeedKey,
      controlFeedKey,
      dataFeedKey
    };

    log('creating space...', { spaceKey });
    const space = await this._spaceManager.constructSpace({
      metadata,
      swarmIdentity: {
        peerKey: this._signingContext.deviceKey,
        credentialProvider: this._signingContext.credentialProvider,
        credentialAuthenticator: this._signingContext.credentialAuthenticator
      }
    });

    await spaceGenesis(
      this._keyring,
      this._signingContext,
      space,
    )

    await this._metadataStore.addSpace(metadata);

    const dataSpace = new DataSpace(space);
    this._spaces.set(dataSpace.key, dataSpace);
    this._dataServiceSubscriptions.registerSpace(space.key, space.database!.createDataServiceHost());
    this.updated.emit();
    return dataSpace;
  }

  // TODO(burdon): Rename join space.
  async acceptSpace(opts: AcceptSpaceOptions): Promise<DataSpace> {
    const metadata: SpaceMetadata = {
      key: opts.spaceKey,
      genesisFeedKey: opts.genesisFeedKey,
      controlFeedKey: opts.controlFeedKey,
      dataFeedKey: opts.dataFeedKey
    };

    const space = await this._spaceManager.constructSpace({
      metadata,
      swarmIdentity: {
        peerKey: this._signingContext.deviceKey,
        credentialProvider: this._signingContext.credentialProvider,
        credentialAuthenticator: this._signingContext.credentialAuthenticator
      }
    });
    await this._metadataStore.addSpace(metadata);

    const dataSpace = new DataSpace(space);
    this._spaces.set(dataSpace.key, dataSpace);
    this._dataServiceSubscriptions.registerSpace(space.key, space.database!.createDataServiceHost());
    this.updated.emit();
    return dataSpace;
  }
}