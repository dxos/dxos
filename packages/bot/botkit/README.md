# @dxos/botkit

## Install

```
$ npm install @dxos/botkit
```

## Concepts

* Bots are human-like peers that can participate in parties, and used to provide some kind of automated service.
* Bot code and dependencies are packaged into a binary, with a `yml` file containing the metadata.
* The bot binary package is uploaded to IPFS, and the metadata is used to create a record in WNS.
* Bot factories are capable of downloading and running bots from WNS/IPFS.

<img src="../../docs/content/diagrams/bot.png" />

## Usage

```javascript
import { Bot, getConfig } from '@dxos/botkit';

new Bot(null, getConfig()).start();
```

## Contributing

PRs accepted.

## License

AGPL-3.0 © DXOS
