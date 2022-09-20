import { FeedStore } from "@dxos/feed-store";
import { NetworkManager } from "@dxos/network-manager";
import { Storage } from "@dxos/random-access-storage";
import { Keyring } from "@dxos/keyring";
import { MetadataStore } from "../metadata";
import { codec } from "@dxos/echo-protocol";
import { IdentityManager } from "./identity-manager";

export class Fubar {
  public metadataStore: MetadataStore;
  public keyring: Keyring;
  public feedStore: FeedStore;
  public identityManager: IdentityManager

  constructor(
    public storage: Storage,
    public networkManager: NetworkManager,
  ) {
    this.metadataStore = new MetadataStore(storage.createDirectory('metadata'));
    this.keyring = new Keyring(storage.createDirectory('keyring'));
    this.feedStore = new FeedStore(storage.createDirectory('feeds'), { valueEncoding: codec })
    this.identityManager = new IdentityManager(
      this.metadataStore,
      this.keyring,
      this.feedStore,
      networkManager,
    )
  }

  async open() {
    await this.identityManager.open()
  }

  async close() {
    await this.identityManager.close()
  }
}