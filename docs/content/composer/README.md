---
order: 0
headerDepth: 0
---

# About Composer

*Composer is built on the DXOS framework. If you want to know more about the framework, check out the [SDK docs](../guide).*

Composer is a team notetaking, whiteboarding, and knowledge management program.

It has three key features:

* **Extensibility**: If your team is operating in a challenging problem domain you need knowledge tools specific to your work. Composer is built for customization from the ground up.
* **Collaboration**: Composer has real-time multiplayer implemented through a local-first model. This makes a lot of things better: from meeting notes to working on airplanes.
* **Openness**: Not only are Composer and the DXOS protocols it's built on open source, the application is cloudless as well. Due to the [CRDT](https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type)-based implementation there's no need for a server other than for backup. DXOS provides backup services if you want them, but you can also host your own.

## Peer-to-peer

Composer gets its real-time collaboration and offline abilities through a peer-to-peer model.

For example a running system might sync data like this, where nodes represent devices:

![Alice and Bob device example](alice-and-bob-devices.svg)

Here [device](../guide/glossary.md#device) means a running DXOS instance. One device runs per browser profile, so users can have multiple devices running on a physical machine. Each device is associated with an [identity](./user-guide/).

[Agents](../guide/tooling/cli/agent.md) are DXOS instances running without an attached user interface. A common use of agents is to run on a server and provide availability if all other devices are offline, but this is completely optional.

## Read More

<a id="technology-preview"></a>
::: warning Technology Preview
Composer is not yet ready for production. There are bugs, and breaking changes may occur. Migration guides will be provided for version updates in the [release notes](https://github.com/dxos/dxos/releases).

All your feedback is most welcome on [Discord](https://discord.gg/eXVfryv3sW).
:::

* To try composer see [Quick Start](./quick-start.md)
* For day-to-day instructions see [User Guide](./user-guide/)
* For information on privacy, the DXOS protocols, etc. see [Concepts and Details](./concepts-and-details.md)
* To learn about or write your first plugin see [SDK/Composer Plugins](../guide/composer-plugins/)
* To learn about full extensibility see the [SDK](../guide/) itself
