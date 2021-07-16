//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import crypto from 'crypto';
import { ServiceBroker } from 'moleculer';

import packageJSON from '../package.json';
import { Serializer } from './serializer';
import { DiscoveryService } from './services/discovery.service';
import { PresenceService } from './services/presence.service';
import { StatusService } from './services/status.service';
import { WebService } from './services/web.service';
import { PeerMap } from './signal';
import { ProtocolTransporter } from './transporter';

const SIGNAL_PROTOCOL_VERSION = 4;

export interface CreateBrokerOpts {
  port?: string | number,
  keyPair?: { publicKey: Buffer, secretKey: Buffer },
  hyperswarm?: any,
  asBootstrap?: boolean,
  repl?: boolean,
  logger?: boolean,
  logLevel?: "fatal" | "error" | "warn" | "info" | "debug" | "trace",
  logFormat?: 'full' | string,
  logDir?: string,
}

/**
 * Create a ServiceBroker
 */
export function createBroker (topic: Buffer, opts: CreateBrokerOpts = {}) {
  assert(Buffer.isBuffer(topic) && topic.length === 32, 'topic is required and must be a buffer of 32 bytes');

  topic = crypto.createHash('sha256')
    .update(topic.toString('hex') + SIGNAL_PROTOCOL_VERSION)
    .digest();

  const {
    port = process.env.PORT ?? 4000,
    keyPair = ProtocolTransporter.keyPair(),
    hyperswarm,
    asBootstrap = false,
    repl = false,
    logger: loggerEnabled = true,
    logLevel,
    logFormat = 'full',
    logDir
  } = opts;

  let logger: {type: string, options: any} | undefined;
  logger = loggerEnabled ? {
    type: 'Console',
    options: {
      formatter: logFormat
    }
  } : undefined;

  if (logger && logDir) {
    logger.type = 'File';
    logger.options = {
      folder: logDir,
      filename: 'dxos-signal-{nodeID}-{date}.log',
      formatter: logFormat
    };
  }

  const broker = new ServiceBroker({
    nodeID: keyPair.publicKey.toString('hex'),
    logger,
    logLevel,
    // repl,
    transporter: new ProtocolTransporter({
      topic,
      keyPair,
      hyperswarm,
      asBootstrap,
      bootstrapPort: port
    }),
    serializer: new Serializer(),
    metadata: {
      port,
      version: packageJSON.version
    },
    created (broker) {
      broker.shared = {
        keyPair,
        peerMap: new PeerMap(keyPair.publicKey)
      };
    },
    started (broker) {
      broker.logger.info('SIGNAL_PROTOCOL_VERSION:', SIGNAL_PROTOCOL_VERSION);
      broker.logger.info('SIGNAL_PROTOCOL_TOPIC:', topic.toString('hex'));

      if (repl) {
        return broker.repl();
      }
    },
    errorHandler (err: any, info) {
      // Handle the error
      if (err.code) {
        // ignore webrtc peer errors
        (this.logger as any).debug('GLOBAL_ERROR:', err);
        return;
      }
      (this.logger as any).warn('GLOBAL_ERROR:', err);
    }
  });

  broker.createService(WebService);
  broker.createService(DiscoveryService);
  broker.createService(PresenceService);
  broker.createService(StatusService);

  return broker;
}

module.exports = { SIGNAL_PROTOCOL_VERSION, ProtocolTransporter };
