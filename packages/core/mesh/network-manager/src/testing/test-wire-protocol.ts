//
// Copyright 2022 DXOS.org
//

import { asyncTimeout, Event } from '@dxos/async';
import { log } from '@dxos/log';
import { TestExtension, TestExtensionWithStreams } from '@dxos/teleport';
import type { TestStreamStats, TeleportExtension } from '@dxos/teleport';
import { ComplexMap } from '@dxos/util';

import { createTeleportProtocolFactory } from '../wire-protocol';

export type TestTeleportExtension = {
  name: string;
  extension: TeleportExtension;
};

export type TestTeleportExtensionFactory = () => TestTeleportExtension[];

export class TestWireProtocol {
  public readonly connections = new Map<string, TestExtension>();
  public readonly streamConnections = new Map<string, TestExtensionWithStreams>();

  public readonly connected = new Event<string>();
  public readonly disconnected = new Event<string>();

  public readonly otherConnections = new ComplexMap<{ remotePeerId: string; extension: string }, TeleportExtension>(
    ({ remotePeerId, extension }) => remotePeerId + extension,
  );

  constructor(private readonly _extensionFactory: TestTeleportExtensionFactory = () => []) {}

  readonly factory = createTeleportProtocolFactory(async (teleport) => {
    log('create', { remotePeerId: teleport.remotePeerId });
    const handleDisconnect = () => {
      this.connections.delete(teleport.remotePeerId);
      this.disconnected.emit(teleport.remotePeerId);
    };
    const extension = new TestExtension({
      onClose: async () => handleDisconnect(),
      onAbort: async () => handleDisconnect(),
    });
    this.connections.set(teleport.remotePeerId, extension);
    teleport.addExtension('test', extension);
    this.connected.emit(teleport.remotePeerId);

    const streamExtension = new TestExtensionWithStreams({
      onClose: async () => {
        this.streamConnections.delete(teleport.remotePeerId);
      },
    });
    this.streamConnections.set(teleport.remotePeerId, streamExtension);
    teleport.addExtension('test-stream', streamExtension);

    for (const { name, extension } of this._extensionFactory()) {
      this.otherConnections.set({ remotePeerId: teleport.remotePeerId, extension: name }, extension);
      teleport.addExtension(name, extension);
    }
  });

  async waitForConnection(peerId: string) {
    if (this.connections.has(peerId)) {
      return this.connections.get(peerId)!;
    }
    log('waitForConnection', { peerId });
    await asyncTimeout(
      this.connected.waitFor((connectedId) => connectedId === peerId),
      // TODO(nf): Make this configurable.
      10_000,
    );
    return this.connections.get(peerId)!;
  }

  async testConnection(peerId: string, message?: string) {
    const connection = await this.waitForConnection(peerId);
    await connection.test(message);
  }

  async openStream(
    peerId: string,
    streamTag: string,
    streamLoadInterval: number,
    streamLoadChunkSize: number,
  ): Promise<string> {
    if (!this.streamConnections.has(peerId)) {
      throw new Error('Connection does not exist.');
    }
    const connection = this.streamConnections.get(peerId)!;
    return connection.addNewStream(streamLoadInterval, streamLoadChunkSize, streamTag);
  }

  async closeStream(peerId: string, streamTag: string): Promise<TestStreamStats> {
    if (!this.streamConnections.has(peerId)) {
      throw new Error('Connection does not exist.');
    }
    const connection = this.streamConnections.get(peerId)!;
    return connection.closeStream(streamTag);
  }
}
