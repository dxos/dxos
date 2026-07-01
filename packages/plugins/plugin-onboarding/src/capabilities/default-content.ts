//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { AppCapabilities, AppSpace } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Graph, Node } from '@dxos/plugin-graph';
import { SpaceCapabilities, SpaceEvents } from '@dxos/plugin-space';

import { OnboardingOperation } from '../operations';
import { type OnboardingOptions } from './capabilities';

const PERSONAL_SPACE_ICON = 'house-line';
const PERSONAL_SPACE_ICON_HUE = 'violet';

const WELCOME_DOCUMENT_NAME = 'Welcome to Composer';

const WELCOME_CONTENT = `![img](https://dxos.network/dxos-logotype-blue.png)

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

### Projects

Projects allow you to work collaboratively with an agent on a specific goal.

Check out those examples:

\`\`\`prompt
Create a project to build a CRM from my inbox.
\`\`\`

\`\`\`prompt
Create a project to track what I ordered online.
\`\`\`

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
`;

export default Capability.makeModule(
  Effect.fnUntraced(function* ({ generateExemplarSpace }: OnboardingOptions) {
    const { Annotation, Obj, Ref } = yield* Effect.tryPromise(() => import('@dxos/echo'));
    const { ClientCapabilities } = yield* Effect.tryPromise(() => import('@dxos/plugin-client'));
    const { Markdown } = yield* Effect.tryPromise(() => import('@dxos/plugin-markdown'));
    const {
      AppAnnotation: { RootCollectionAnnotation },
      AppSpace: { getPersonalSpace },
    } = yield* Effect.tryPromise(() => import('@dxos/app-toolkit'));

    const operationInvoker = yield* Capability.get(Capabilities.OperationInvoker);
    const { graph } = yield* Capability.get(AppCapabilities.AppGraph);
    const client = yield* Capability.get(ClientCapabilities.Client);

    const personalSpace = getPersonalSpace(client);
    if (!personalSpace) {
      return Capability.contributes(Capabilities.Null, null);
    }
    Obj.update(personalSpace.properties, (obj) => {
      obj.icon = PERSONAL_SPACE_ICON;
      obj.iconHue = PERSONAL_SPACE_ICON_HUE;
    });

    // Run plugin OnCreateSpace callbacks against the personal space so capabilities that
    // depend on a fresh space (e.g. skills) wire themselves up. The exemplar space
    // gets the same callbacks via the regular SpaceCreated event on import.
    yield* Plugin.activate(SpaceEvents.SpaceCreated);
    const personalRootCollection = Option.getOrUndefined(
      Annotation.get(personalSpace.properties, RootCollectionAnnotation),
    )?.target;
    if (personalRootCollection) {
      const onCreateSpaceCallbacks = yield* Capability.getAll(SpaceCapabilities.OnCreateSpace);
      yield* Effect.all(
        onCreateSpaceCallbacks.map((onCreateSpace) =>
          onCreateSpace({ space: personalSpace, isDefault: true, rootCollection: personalRootCollection }).pipe(
            Effect.provideService(Operation.Service, operationInvoker),
          ),
        ),
      );

      // Add a welcome document to the personal space root collection.
      const welcomeDoc = Markdown.make({ name: WELCOME_DOCUMENT_NAME, content: WELCOME_CONTENT });
      personalSpace.db.add(welcomeDoc);
      Obj.update(personalRootCollection, (personalRootCollection) => {
        personalRootCollection.objects.push(Ref.make(welcomeDoc));
      });
    }

    if (generateExemplarSpace) {
      yield* Effect.promise(() => operationInvoker.invokePromise(OnboardingOperation.ImportExemplarSpace, {}));

      // Eagerly expand the graph so the exemplar space's content is visible in the navtree
      // as soon as the user opens it, without waiting for a lazy expansion pass.
      const exemplarSpace = client.spaces.get().find((space) => space.tags.includes(AppSpace.EXEMPLAR_SPACE_TAG));
      graph.pipe(Graph.expand(Node.RootId, 'child'), Graph.expand(personalSpace.id, 'child'));
      if (exemplarSpace) {
        graph.pipe(Graph.expand(exemplarSpace.id, 'child'));
      }
    } else {
      graph.pipe(Graph.expand(Node.RootId, 'child'), Graph.expand(personalSpace.id, 'child'));
    }
  }),
);
