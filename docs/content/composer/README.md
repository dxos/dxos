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

For example a running system might sync data like this, where nodes represent devices and edges represent syncing connections:

![Alice and Bob device example](alice-and-bob-devices.svg)

The syncing connections will re-adjust themselves as devices come on and offline. If Bob's desktop goes offline his smartphone will connect to either Alice's desktop or smartphone in order to stay up-to-date.

The use of an [Agent](../guide/tooling/cli/agent.md) is optional. Agents provide availability if all other devices are offline, but aren't required otherwise.

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
