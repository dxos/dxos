# Bots docs

## Introduction

Bots framework allows you to create a custom DXOS bot and run it on a KUBE, or use and run an already existent one. Bots are human-like peers that can participate in parties, and are generally used to provide some kind of automated service.

## Core concepts

* Bots don't have to, but are designed to contain DXOS client and be invited to a specific party.
* Bots are supposed to be up and running all the time unless explicitly stopped or removed. This also means that in most cases one would want to subscribe to some events in order for bot to be able to provide some service in response to those events.
* Bot factory is a service that manages bots. It is supposed to be run on a KUBE.
* Bundled file with a bot is uploaded to IPFS, and a record representing this bot is created in DXNS. Bot factories are capable of resolving bot records in DXNS and downloading bundles from IPFS.

## Architecture

General bots framework architecture is presented on a diagram below.

<img src="bot.drawio.svg" />

BotController is what exposes BotFactory service to the outer world. You can use [BotFactoryClient](bot-factory-client) to connect to and use BotFactory service in your code. To create a BotFactory client in your code you can do:
```typescript
  const topic = config.get('runtime.services.bot.topic');
  assert(topic, 'Topic must be provided');

  const botFactoryClient = new BotFactoryClient(client.echo.networkManager);
  await botFactoryClient.start(PublicKey.from(topic));
```
This will take topic from your client config and try to establish connection to a bot factory specified by this topic. The topic can be found at KUBE's services endpoint (e.g. [https://experimental.kube.dxos.network/kube/services](https://experimental.kube.dxos.network/kube/services)) under bot-factory name of service. 
