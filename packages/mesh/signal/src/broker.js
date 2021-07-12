//
// Copyright 2020 DxOS.
//

const assert = require('assert');
const crypto = require('crypto');

const { ServiceBroker } = require('moleculer');

const { PeerMap } = require('./signal');
const { ProtocolTransporter } = require('./transporter');
const { Serializer } = require('./serializer');
const packageJSON = require('../package.json');

// Services
const { WebService } = require('./services/web.service');
const { DiscoveryService } = require('./services/discovery.service');
const { PresenceService } = require('./services/presence.service');
const { StatusService } = require('./services/status.service');

const SIGNAL_PROTOCOL_VERSION = 4;

/**
 * Create a ServiceBroker
 *
 * @param {Buffer} topic
 * @param {Object} opts
 * @param {number} [opts.port=4000]
 * @param {{ publicKey: Buffer, secretKey: Buffer }} opts.keyPair
 * @param {Object} opts.hyperswarm Hyperswarm options
 * @param {boolean} [opts.asBootstrap=false]
 * @param {boolean} [opts.repl=false]
 * @param {boolean} [opts.logger=true]
 * @param {string} [opts.logLevel='info']
 * @param {string} [opts.logFormat='full']
 * @param {string} [opts.logDir]
 */
function createBroker (topic, opts = {}) {
  assert(Buffer.isBuffer(topic) && topic.length === 32, 'topic is required and must be a buffer of 32 bytes');

  topic = crypto.createHash('sha256')
    .update(topic.toString('hex') + SIGNAL_PROTOCOL_VERSION)
    .digest();

  const {
    port = process.env.PORT || 4000,
    keyPair = ProtocolTransporter.keyPair(),
    hyperswarm,
    asBootstrap = false,
    repl = false,
    logger: loggerEnabled = true,
    logLevel,
    logFormat = 'full',
    logDir
  } = opts;

  const logger = loggerEnabled && {
    type: 'Console',
    options: {
      formatter: logFormat
    }
  };

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
    repl,
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
    errorHandler (err, info) {
      // Handle the error
      if (err.code) {
        // ignore webrtc peer errors
        this.logger.debug('GLOBAL_ERROR:', err);
        return;
      }
      this.logger.warn('GLOBAL_ERROR:', err);
    }
  });

  broker.createService(WebService);
  broker.createService(DiscoveryService);
  broker.createService(PresenceService);
  broker.createService(StatusService);

  return broker;
}

module.exports = { createBroker, SIGNAL_PROTOCOL_VERSION, ProtocolTransporter };
