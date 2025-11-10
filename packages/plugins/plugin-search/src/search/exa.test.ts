//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { EXA_API_KEY } from '@dxos/ai/testing';
import { log } from '@dxos/log';
import { Testing } from '@dxos/schema/testing';

import { search } from './exa';

describe.skip('Search', () => {
  describe('Query-based', () => {
    test.skip('contacts', { timeout: 60_000 }, async () => {
      const objects = await search({
        query: 'top executives at google',
        schema: [Testing.Person],
        exaApiKey: EXA_API_KEY,
      });

      log.info('result', { objects });
    });

    test.skip('contacts projects and orgs', { timeout: 60_000 }, async () => {
      const objects = await search({
        query: 'top executives at google',
        schema: [Testing.Person, Testing.Project, Testing.Organization],
        exaApiKey: EXA_API_KEY,
      });

      log.info('result', { objects });
    });

    test('a19z org, projects they invest in and team', { timeout: 60_000 }, async () => {
      const objects = await search({
        query: 'a19z org, projects they invest in and team',
        schema: [Testing.Project, Testing.Organization, Testing.Person],
        exaApiKey: EXA_API_KEY,
      });

      console.log(JSON.stringify(objects, null, 2));
    });

    test('companies building CRDTs', { timeout: 60_000 }, async () => {
      const objects = await search({
        query: 'companies building CRDTs',
        schema: [Testing.Project, Testing.Organization, Testing.Person],
        exaApiKey: EXA_API_KEY,
      });

      console.log(JSON.stringify(objects, null, 2));
    });
  });

  describe('Context-based', () => {
    test('composer context-based search', { timeout: 60_000 }, async () => {
      const objects = await search({
        context: COMPOSER_DXOS_DOC,
        schema: [Testing.Project, Testing.Organization, Testing.Person],
        exaApiKey: EXA_API_KEY,
      });

      console.log(JSON.stringify(objects, null, 2));
    });

    test.only('edge architecture', { timeout: 60_000 }, async () => {
      const objects = await search({
        context: EDGE_ARCHITECTURE_DOC,
        schema: [Testing.Project, Testing.Organization, Testing.Person],
        exaApiKey: EXA_API_KEY,
      });

      console.log(JSON.stringify(objects, null, 2));
    });
  });
});

const COMPOSER_DXOS_DOC = `
![img](https://dxos.network/dxos-logotype-blue.png)
# Welcome to Composer by DXOS

## What is Composer?

Composer is an extensible application that includes familiar components such as documents, diagrams, and tables. It leverages DXOS — a full stack framework for building collaborative local-first applications.

With our SDK, you'll be able to build custom plugins, leverage external APIs and integrate with LLMs. All inside of a private collaborative workspace.

## Disclaimer

Composer is currently in Beta. We are offering an early preview of its collaborative and programmable features, and we would greatly appreciate your feedback to help improve it before the official launch.

Please join our [Discord](https://dxos.org/discord) to share feature requests, bug reports, and general questions about your experience.

## Working in Composer

Composer is made up from plugins developed by DXOS and the community. Plugins typically manage data objects that represent different types of content.

Plugins can be installed and configured from the Settings dialog. By default Composer installs the following plugins:

- **Document** - Collaborative Markdown documents, with realtime comments.
- **Sketches** - Use an infinite canvas to create dynamic diagrams or simple drawings.
- **Tables** - Structured records with sorting and filtering.
- **Sheets** - Numeric data with formulas and charts.

Objects can be organized inside of **Collections** and **Spaces** to create dynamic documents.

### Spaces

Think of Spaces as collaborative workspaces inside of Composer that can be used to partition content as well as restrict access to your various Objects and Collections.

Your Spaces are listed in the left sidebar of your Composer window and your Objects and Collections are nested inside of these as children elements. If you look now, you will find this README collection nested inside of your first Space which was created for you by default when you entered Composer.

### Collections

Collections are a high level structure for organizing your documents inside of Composer. Collections can contain multiple "objects" which include things like documents, sketches, and more.

### Collaboration

Composer is a realtime collaborative environment. This means multiple people can be working inside of the same Space, Collection or Object at any given time without overwriting each others changes. This is one of the core benefits of the DXOS platform.

Invite a collaborator to your shared Space by selecting the Space from the sidebar and clicking the "Share" button in the top menu. From here you can create a single or multi-use invite. That same share button will also show you who currently has access to any given Space.

## Our Promise to You

We are early on our journey, but here are a few things that will always be true about Composer.

**Free to use**
Since Composer does not depend on centralized servers to operate, there is no significant overhead for running the core system.

**Private by default**
Data from Composer is stored locally on your device. This means no one else can see it unless you invite them to a shared space.

**Collaborative**
The DXOS framework is built from the ground up to be collaborative. This means real-time multiplayer functionality is baked in as a core primitive.

**Extensible**
Need a feature that we do not offer inside of Composer? Build a plugin for yourself or share it with the community so that others can benefit from your creativity.

**Open Source**
Both DXOS and Composer are open source projects and the source code is available on [Github](https://github.com/dxos/dxos).

## Other things to consider

**Warning! - No formal backups:**
If you lose your device, you will lose access to your work inside of Composer. To ensure you do not lose your work, you may want to connect a secondary device to your workspace to serve as a backup.

**No login needed:**
You may have noticed that you do not need to log in to use Composer like you might with traditional software. This is because your identity is tied to your specific device as well as your browser. If you would like to log in from other devices or other browsers you will first need to click on the HALO button (lower left corner of Composer window) and add a device from there. Check our documentation to learn more about the HALO identity systems and how we manage authentication.

## Need help?

Learn more about DXOS and Composer be exploring our [documentation](https://docs.dxos.org).

Join our [Discord](https://dxos.org/discord) to share feature requests, bug reports, and general questions about our platform.
// `;

// TODO(dmaretskyi): Import as txt.
const EDGE_ARCHITECTURE_DOC = `
## Composition

### Composer

- within Composer functions are represented as \`ScriptType\` objects
- the script plugin is used to allow scripts to be edited
- \`ScriptType\` objects are not directly tied to deployments of functions, however a deployment may reference a script as it's source
- esbuild will be used to bundle scripts in-browser before uploading them to the functions service in order to allow dependencies to be used in the packages
  - internal dxos dependencies can be provided directly to esbuild
  - for all other dependencies, it will depend on esm urls from a CDN but will bundle those dependencies in before upload because CF Workers do not currently support esm url imports

### External

- functions can also be deployed directly against the functions service api or via the cli
- the source of these functions are not necessarily (likely not) represented by a \`ScriptType\` object
- the assumption from the cli will be that bundling was done independently

## Deployment

- functions are always deployed within the context of a space even if the source code itself is not stored in that space

### Client Side

- there will not be any check by the service that a deployment object was created for a function but that is the expectation
- deployment object will point to \`ScriptType\` object of function source if it exists
- deployment object will include binding for local invocation
- deployment object will store function id in meta keys

### Service Side

- verify that the identity deploying the function is a member of the space they are attempting to deploy to
- generates function id for deployment, associates the function id with the deployment object id for invocation purposes
- returns function id to be stored as meta key on deployment object

## Invocation

- all functions will be publicly invokable for the time being
- functions are discovered via echo spaces

### Client Side

- hyperformla functions are statically defined so the available functions will be the same globally
- however edge functions bindings may differ per space, so \`FOO\` may be bound to two different functions in two different spaces
  - QUESTION: if there a mulitple bindings for \`FOO\` but no binding in the current space, is there a way to affect which binding is used?
    - default by sort spaces by space id and use first binding
    - allow user to override (initially globally in settings and later per space/object)
  - QUESTION: is this actually even possible? The routing should be possible, but the function description would need to be static and couldn't change per space
    - simple answer, no function descriptions need to rendered
    - alternative, provide translations per-space and a HF instance per space for each set of translations
- when autocompleting a formula the data stored for the cell should be the fq id of the deployment object
- given the fq id of the deployment object, anyone in the space should be able to invoke the function even if they don't have access to the object itself

### Service Side
`;
