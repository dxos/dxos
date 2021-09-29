#!/usr/bin/env node

//
// Copyright 2021 DXOS.org
//

// TODO(burdon): Refactor and rename (main) so that this is imported from bin/signal.js

import crypto from 'crypto';
import yargs from 'yargs';

import { createBroker, LogFormat, LogLevel } from './broker';

const LOG_LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error'];
const DEFAULT_LOG_LEVEL: LogLevel = 'info';

const LOG_FORMATS: LogFormat[] = ['full', 'short', 'simple', 'json'];
const DEFAULT_LOG_FORMAT: LogFormat = 'full';

yargs
  .command('$0', 'start a signal server', {
    topic: {
      describe: 'topic to find other signal servers',
      default: '#dxos',
      type: 'string'
    },
    port: {
      alias: 'p',
      describe: 'defines a port to listening',
      default: 4000
    },
    bootstrap: {
      alias: 'b',
      describe: 'defines a list of bootstrap nodes',
      type: 'string'
    },
    asBootstrap: {
      describe: 'enable the signal as a bootstrap node',
      type: 'boolean',
      default: false
    },
    repl: {
      alias: 'r',
      describe: 'start a repl console with your signal',
      type: 'boolean'
    },
    logLevel: {
      alias: 'l',
      describe: 'defines the log level',
      default: DEFAULT_LOG_LEVEL,
      choices: LOG_LEVELS
    },
    logFormat: {
      describe: 'defines the log format',
      default: DEFAULT_LOG_FORMAT,
      choices: LOG_FORMATS
    },
    logDir: {
      describe: 'defines a log directory',
      type: 'string'
    }
  }, (argv) => {
    const topic = crypto.createHash('sha256')
      .update(argv.topic)
      .digest();

    void createBroker(topic, {
      port: argv.port,
      hyperswarm: {
        bootstrap: argv.bootstrap ? argv.bootstrap.split(',') : undefined,
        maxPeers: 5
      },
      asBootstrap: argv.asBootstrap,
      repl: argv.repl,
      logLevel: argv.logLevel,
      logFormat: argv.logFormat,
      logDir: argv.logDir
    }).start();
  })
  .help()
  .parse();
