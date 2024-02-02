# Composer Overview

Composer is a free, open-source, malleable, multiplayer, local-first knowledge environment powered by DXOS. Users can collaborate real-time, work offline, and retain privacy through the peer-to-peer protocols of DXOS. User data is never stored on any servers and does not leave devices the user trusts. Composer works entirely on the client, local-first, with no private data silos.

Developers can replace or extend any of Composer's functionality through plugins - every feature of composer is implemented as a plugin that can be swapped or extended. Community contributions are most welcome.

Try [Composer](https://composer.dxos.org).

## Key Features

- **Extensibility**: Every feature of Composer is implemented through the extensibility model, leaving nothing off-limits to malleability.
- **Collaboration**: Built-in real-time multiplayer functionality for sharing and collaboration.
- **Privacy-First**: Ensures privacy, availability, and functionality offline. No data silos or intermediaries.
- **Runs everywhere**: Designed for mobile and desktop, works in modern browsers.
- **Native and Desktop apps**: Installable to your desktop or home screen (**coming soon**).

::: warning Caution
## Technology Preview

Composer is in technology preview, not yet ready for production. Feedback is sought to refine the product, and breaking changes may occur. Migration guides will be provided for version updates in the [release notes](https://github.com/dxos/dxos/releases). Talk to us on [Discord](https://discord.gg/eXVfryv3sW) with any feedback.
:::

## Use Cases

Composer's extensibility model allows it to be used in a wide variety of use cases, including:
- **Personal Knowledge Management**: Organize and manage personal knowledge, notes, tasks, diagrams, and other kinds of content.
- **Collaborative Work**: Share and collaborate on documents, projects, and tasks.
- **Data Integration**: Integrate and visualize data from diverse sources and formats.
- **Custom Applications**: Build custom applications and workflows on top of Composer.

## Architecture

Built with DXOS, Composer leverages local data storage and peer-to-peer replication via ECHO, passwordless and decentralized identity management (HALO), encrypted data transfer, and conflict resolution via CRDTs.

### Core Concepts

- **Plugins**: Extend functionality across various aspects of the user interface and data integration.
- **Surfaces**: Allows plugins to delegate presentation of arbitrary content to a set of plugins. This allows developers to easily render arbitrary content and for plugins to collaborate on presenting any kind of content.
- **Intents**: Plugins can communicate with each other through a system of intents that represent user actions, enabling plugins to respond to changes in state initiated by the user or any other plugin.

### Learn more

- Try [Composer](https://composer.dxos.org) 
- Check out the [source](https://github.com/dxos/dxos/tree/main/packages/apps/composer-app)
- See the source code to the various [plugins](https://github.com/dxos/dxos/tree/main/packages/apps/plugins)
- Talk to us on [Discord](https://discord.gg/eXVfryv3sW)