# @dxos/signal

![npm (scoped)](https://img.shields.io/npm/v/@dxos/signal)
[![js-semistandard-style](https://img.shields.io/badge/code%20style-semistandard-brightgreen.svg?style=flat-square)](https://github.com/standard/semistandard)
[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)

The DXOS signal server managed WebRTC connections between peers.

## Install

```
npm install -g @dxos/signal
```

## Usage

```
$ signal --help

signal [topic]

start a signal server

Options:
  --version        Show version number                                 [boolean]
  --help           Show help                                           [boolean]
  --topic          topic to find other signal servers[string] [default: "#dxos"]
  --port, -p       defines a port to listening                   [default: 4000]
  --bootstrap, -b  defines a list of bootstrap nodes                     [array]
  --asBootstrap    enable the signal as a bootstrap node
                                                      [boolean] [default: false]
  --repl, -r       start a repl console with your signal               [boolean]
  --logLevel, -l   defines the log level
                   [choices: "debug", "info", "warn", "error"] [default: "info"]
  --logFormat      defines the log format
                  [choices: "full", "short", "simple", "json"] [default: "full"]
  --logDir         defines a log directory                              [string]
```

To create and start the signal server:

```javascript
import { createBroker } from '@dxos/signal';

const topic = randomBytes(32);

createBroker(topic, opts).start();
```

## Compatibility

This package is using `@koush/wrtc` in place of `wrtc` for compatibility with M1 Macs.

## API

...

## Contributing

PRs accepted.

## License

GPL-3.0 © dxos

# DXOS Signal Server
