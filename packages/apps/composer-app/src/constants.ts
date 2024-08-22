//
// Copyright 2023 DXOS.org
//

export const appKey = 'composer.dxos.org';

export const INITIAL_TITLE = 'README';

// TODO(wittjosiah): Translate.
export const INITIAL_CONTENT = [
  `# Welcome to Composer by DXOS
![img](https://dxos.org/images/logo/dxos-logotype-white.svg)
### Disclaimer
Composer is a proving ground for the [DXOS framework](https://docs.dxos.org/) and our evolving plugin ecosystem. While Composer is stable and robust, it should not be treated as production-ready software quite yet.

### What is Composer?
Composer is **a new programmable document format**. It blends the power of various popular data structures (e.g. docs, sketches & tables) and allows you to compose them natively inside of a collaborative workspace.`,
  `### Working in Composer
There are many different "objects" you can work with inside of Composer. The most common are:

- **Docs** - Composer supports collaborative markdown files natively.
- **Sketches** - Use an infinite canvas to create dynamic diagrams or simple drawings.
- **Tables** - Build simple tables for structured data.

Objects can be organized inside of **Collections** and **Spaces** to create dynamic documents.

#### Spaces
Think of Spaces as collaborative workspaces inside of Composer that can be used to partition content as well as restrict access to your various Objects and Collections.

Your Spaces are listed in the left sidebar of your Composer window and your Objects and Collections are nested inside of these as children elements. If you look now, you will find this README collection nested inside of your first Space which was created for you by default when you entered Composer.

#### Collections
Collections are a high level structure for organizing your documents inside of Composer. Collections can contain multiple "objects" which include things like documents, sketches, and more.

#### Collaboration
Composer is a realtime collaborative environment. This means multiple people can be working inside of the same Space, Collection or Object at any given time without overwriting each others changes. This is one of the core benefits of the DXOS platform.

Invite a collaborator to your shared Space by selecting the Space from the sidebar and clicking the "Share" button in the top menu. From here you can create a single or multi-use invite. That same share button will also show you who currently has access to any given Space.`,
  `### Our Promise to You
We are early on our journey, but here are a few things that will always be true about Composer.

**Free to use**
Since Composer does not depend on centralized servers to operate, there is no significant overhead for running it. This means we can offer Composer to the public for free with no need to spy on your data or build predatory advertising models.

**Private by default**
Data from Composer is stored locally on your device. This means no one else can see it unless you invite them to a shared space. Not even us.

**Collaborative**
The DXOS framework is built from the ground up to be collaborative. This means real-time multiplayer functionality is baked in as a core primitive.

**Extensible**
Need a feature that we do not offer inside of Composer? Build a plugin for yourself or share it with the community so that others can benefit from your creativity.

**Open Source**
Both DXOS and Composer are open source projects and the source code is available on [Github](https://github.com/dxos/dxos).

### Other things to consider

**Warning! - No formal backups:**
If you lose your device, you will lose access to your work inside of Composer. To ensure you do not lose your work, you may want to connect a secondary device to your workspace to serve as a backup.

**No login needed:**
You may have noticed that you do not need to log in to use Composer like you might with traditional software. This is because your identity is tied to your specific device as well as your browser. If you would like to log in from other devices or other browsers you will first need to click on the HALO button (lower left corner of Composer window) and add a device from there. Check our documentation to learn more about the HALO identity systems and how we manage authentication.

### Need help?

Learn more about DXOS and Composer be exploring our [documentation](https://docs.dxos.org).

Join the [Discord](https://discord.gg/uTYyx6srAW) to share feature requests, bug reports, and general questions about our platform.`,
];
