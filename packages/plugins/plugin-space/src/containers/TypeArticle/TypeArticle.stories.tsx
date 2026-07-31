//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { useAtomCapability } from '@dxos/app-framework/ui';
import { AppCapabilities } from '@dxos/app-toolkit';
import { AppAnnotation } from '@dxos/app-toolkit';
import { Annotation, Collection, DXN, Obj, Ref, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/Annotation';
import { organizationIdentitySpec, personIdentitySpec } from '@dxos/extractor-lib';
import { PublicKey } from '@dxos/keys';
import { ClientPlugin } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { type Space, useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import { CardAnnotation } from '@dxos/schema';
import { Organization, Person } from '@dxos/types';
import { ComplexMap } from '@dxos/util';

import { translations } from '#translations';

import { SpaceOperationHandlerSet } from '../../operations';
import { SpaceCapabilities } from '../../types';
import { MergePreview } from '../MergePreview/MergePreview';
import { ObjectCardStack } from '../ObjectCardStack/ObjectCardStack';
import { TypeArticle } from './TypeArticle';

/**
 * Type that opts in to a content preview card via `CardAnnotation`.
 */
class CardType extends Type.makeObject<CardType>(DXN.make('org.dxos.type.test.cardType', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    description: Schema.optional(Schema.String),
  }).pipe(
    LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--cards--regular', hue: 'emerald' }),
    CardAnnotation.set(true),
  ),
) {}

/**
 * Seed people covering every branch of the duplicate scan:
 *  - Alice: three records sharing one address, in two different cases (email identity);
 *  - Bob: two records with no shared address, chained through a Google resource name (foreign-key
 *    identity) — the F2 case where mail sync and contacts sync each made their own Person;
 *  - the two role inboxes: same display name, different addresses — deliberately NOT duplicates;
 *  - Dana: unique, so the list always has a non-duplicate to compare against.
 */
const GOOGLE = 'google.com/contacts';

const seedPeople = (space: Space) => {
  // Stories create their space through the raw client API, which skips the space-plugin create flow;
  // without a root collection `RemoveObjects` (the table's Delete button) fails its invariant. The
  // collection is added before the annotation: `db.add` inside an `Obj.update` callback is a write
  // during a write.
  const rootCollection = space.db.add(Collection.make());
  Obj.update(space.properties, (properties) => {
    Annotation.set(properties, AppAnnotation.RootCollectionAnnotation, Ref.make(rootCollection));
  });

  space.db.add(
    Person.make({
      fullName: 'Alice Andrews',
      emails: [{ value: 'alice@dxos.org' }],
    }),
  );
  space.db.add(
    Person.make({
      fullName: 'Alice A.',
      jobTitle: 'Engineer',
      emails: [{ value: 'ALICE@dxos.org' }],
    }),
  );
  space.db.add(
    Person.make({
      fullName: 'A. Andrews',
      emails: [{ value: 'alice@dxos.org' }, { value: 'alice@personal.com' }],
      phoneNumbers: [{ value: '+1 (415) 555-0100' }],
    }),
  );

  space.db.add(
    Person.make({
      [Obj.Meta]: { keys: [{ source: GOOGLE, id: 'people/c1' }] },
      fullName: 'Bob Brown',
      emails: [{ value: 'bob@dxos.org' }],
    }),
  );
  space.db.add(
    Person.make({
      [Obj.Meta]: { keys: [{ source: GOOGLE, id: 'people/c1' }] },
      fullName: 'Robert Brown',
      emails: [{ value: 'robert@personal.com' }],
      notes: 'Synced from Google Contacts.',
    }),
  );

  space.db.add(Person.make({ fullName: 'DXOS', emails: [{ value: 'no-reply@dxos.org' }] }));
  space.db.add(Person.make({ fullName: 'DXOS via TestFlight', emails: [{ value: 'testflight@email.apple.com' }] }));
  space.db.add(Person.make({ fullName: 'Dana Diaz', emails: [{ value: 'dana@example.com' }] }));

  space.db.add(Organization.make({ name: 'DXOS', website: 'dxos.org' }));
};

type StoryArgs = {
  type: Type.AnyObj;
  count?: number;
};

const DefaultStory = ({ type }: StoryArgs) => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  if (!space) {
    return <Loading />;
  }

  return (
    <div role='none' className='w-full grid grid-cols-2'>
      <TypeArticle role='article' space={space} type={type} attendableId='story' />
      <StoryCompanion space={space} type={type} />
    </div>
  );
};

/**
 * Stand-in for the deck's Selected companion plank, mirroring the branch in `react-surface.tsx`:
 * a staged merge takes the panel over, otherwise it shows the selected objects. Without it the
 * merge preview has nowhere to render and the review cannot be walked end to end in a story.
 */
const StoryCompanion = ({ space, type }: { space: Space; type: Type.AnyObj }) => {
  const { mergePreview } = useAtomCapability(SpaceCapabilities.EphemeralState);
  if (mergePreview?.typeUri === Type.getURI(type)) {
    return <MergePreview type={type} spaceId={space.id} preview={mergePreview} />;
  }

  return <ObjectCardStack objectId={Type.getURI(type)} db={space.db} type={type} />;
};

/** Ephemeral state the toolbar and the merge preview read; normally contributed by `state.ts`. */
const ephemeralState = () =>
  Atom.make<SpaceCapabilities.SpaceEphemeralState>({
    awaiting: undefined,
    sdkMigrationRunning: {},
    navigableCollections: false,
    viewersByObject: {},
    viewersByIdentity: new ComplexMap<PublicKey, Set<string>>(PublicKey.hash),
    mergePreview: undefined,
    lastMergeAt: undefined,
  }).pipe(Atom.keepAlive);

const meta = {
  title: 'plugins/plugin-space/containers/TypeArticle',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager<StoryArgs>(({ args: { count = 10 } }) => ({
      capabilities: [
        Capability.contributes(AppCapabilities.Translations, translations),
        // The Duplicates tab is driven by real operations, so the story registers the handler set
        // and the state atom the space plugin would normally contribute.
        Capability.contributes(Capabilities.OperationHandler, SpaceOperationHandlerSet),
        Capability.contributes(SpaceCapabilities.EphemeralState, ephemeralState()),
        // The plugin contributes these itself in the app; the story has no plugin-space modules.
        Capability.contributes(SpaceCapabilities.IdentitySpec, personIdentitySpec),
        Capability.contributes(SpaceCapabilities.IdentitySpec, organizationIdentitySpec),
      ],
      plugins: [
        ...corePlugins(),
        StorybookPlugin({}),
        PreviewPlugin(),
        ClientPlugin({
          types: [CardType, Collection.Collection, Person.Person, Organization.Organization],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* Effect.promise(() => client.halo.createIdentity());
              const space = yield* Effect.promise(() => client.spaces.create());
              yield* Effect.promise(() => space.waitUntilReady());

              seedPeople(space);
              for (let i = 0; i < count; i++) {
                space.db.add(
                  Obj.make(CardType, { name: `Card ${i + 1}`, description: `Preview body for card ${i + 1}.` }),
                );
              }

              // The scan queries the space, so the seed must be indexed before the tab is opened.
              yield* Effect.promise(() => space.db.flush({ indexes: true }));
            }),
        }),
      ],
    })),
  ],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    type: CardType,
    count: 8,
  },
};

/**
 * Person, whose identity rule (email + foreign key) is registered — so the toolbar offers the
 * Duplicates tab. Selection and the merge preview both surface in the companion beside the article.
 *
 * Test:
 * 1. Switch to the third toolbar tab (the copy icon). The filter is replaced by
 *    Merge / Skip / a `1 / 2` counter / arrows.
 * 2. The masonry shows the first group only: the three Alice records (they share `alice@dxos.org`,
 *    one of them cased `ALICE@`).
 * 3. Click a card. It becomes current and the companion shows its form. Click again to deselect.
 * 4. Press the right arrow. The counter reads `2 / 2` and the two Bob records appear — they share
 *    no address, and are grouped only by the Google resource name on both.
 * 5. Press the left arrow to return to group 1, then press Merge. The companion swaps to the merge
 *    preview: `fullName` is `Alice Andrews` (the oldest record wins), `jobTitle` is `Engineer`
 *    (filled from a later record), and `emails` lists `alice@dxos.org` once — lower-cased — plus
 *    `alice@personal.com`.
 * 6. Edit `nickname` in the preview form, then press Confirm merge. The article returns to the
 *    scan, the counter reads `1 / 1`, and only the Bob group remains.
 * 7. Switch to the Cards tab. There are now six people, not eight: one Alice carrying every merged
 *    field plus your nickname edit.
 * 8. Switch to the Table tab and check two rows. A `Delete 2 objects` button appears in the
 *    toolbar.
 * 9. Confirm the two role inboxes (`DXOS` and `DXOS via TestFlight`) were never offered as a
 *    group — same display name, different addresses, correctly left alone.
 */
export const Duplicates: Story = {
  args: {
    type: Person.Person,
  },
};
