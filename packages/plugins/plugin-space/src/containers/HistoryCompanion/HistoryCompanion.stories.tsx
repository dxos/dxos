//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import React from 'react';

import { Capability } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AppCapabilities, TimeTravelAnnotation } from '@dxos/app-toolkit';
import { Entity, Filter, Obj, Ref, Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { ClientPlugin } from '@dxos/plugin-client/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { useObject, useQuery, useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';

import { translations } from '#translations';

import { HistoryCompanion } from './HistoryCompanion';

// A minimal type that opts into time-travel via the annotation. Mirrors markdown: the editable text
// lives in a referenced Text.Text child, so the scrubber must aggregate the child's history too.
const HistoryDoc = Schema.Struct({
  title: Schema.optional(Schema.String),
  content: Ref.Ref(Text.Text),
}).pipe(TimeTravelAnnotation.set(true), Type.makeObject(DXN.make('com.example.type.historyDoc', '0.1.0')));
type HistoryDoc = Type.InstanceType<typeof HistoryDoc>;

/**
 * Resolves the document AND its text child reactively. Because time-travel is applied in place on the
 * live objects, the snapshots returned by `useObject` reflect the historical view while scrubbing —
 * exactly what a normal editor binding sees. Read-only keys off the PRIMARY's `Entity.timeTravelAtom`,
 * which the companion keeps for the whole scrub session even when only the child text is historical.
 */
const PrimaryPreview = ({ object }: { object: HistoryDoc }) => {
  // Resolve reactively via useObject (snapshots) — never via `.target`.
  const [doc] = useObject(object);
  const [text] = useObject(object.content);
  const readonly = useAtomValue(Entity.timeTravelAtom(object));
  const title = doc?.title;
  const content = text?.content;

  return (
    <div className='flex h-full flex-col gap-2 p-4'>
      <div className='text-sm text-description'>
        Primary plank — {readonly ? 'time-traveling (read-only)' : 'live'} — {title ?? ''}
      </div>
      <div className='grow overflow-auto whitespace-pre-wrap break-words rounded-sm bg-input-surface p-3 font-mono text-sm'>
        {content ?? ''}
      </div>
    </div>
  );
};

const DefaultStory = () => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  const docs = useQuery(space?.db, Filter.type(HistoryDoc));
  const doc = docs[0];
  if (!doc) {
    return <Loading />;
  }

  // Fixed 3:2 ratio (min-w-0 + overflow) so scrubbing content never changes the planks' widths.
  return (
    <div className='flex h-full divide-x divide-separator'>
      <div className='min-w-0 flex-[3]'>
        <PrimaryPreview object={doc} />
      </div>
      <div className='min-w-0 flex-[2]'>
        <HistoryCompanion role='article' companionTo={doc} />
      </div>
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-space/containers/HistoryCompanion',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      capabilities: [Capability.contributes(AppCapabilities.Translations, translations)],
      plugins: [
        ...corePlugins(),
        StorybookPlugin({}),
        ClientPlugin({
          types: [HistoryDoc, Text.Text],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* Effect.promise(() => client.halo.createIdentity());
              const space = yield* Effect.promise(() => client.spaces.create());
              yield* Effect.promise(() => space.waitUntilReady());

              // Text lives in a child object (mirroring markdown's Document -> content Text).
              const text = space.db.add(Text.make({ content: '# Release notes\n' }));
              const doc = space.db.add(Obj.make(HistoryDoc, { title: 'Release notes', content: Ref.make(text) }));
              Obj.setParent(text, doc);

              // Generate history across a few editing sessions separated by gaps (> the coalescing
              // window) so the scrubber shows distinct, coalesced steps rather than one-per-edit.
              let change = 0;
              for (let session = 0; session < 3; session++) {
                for (let i = 0; i < 5; i++) {
                  change += 1;
                  Obj.update(text, (text) => {
                    if (change % 6 === 0) {
                      text.content = text.content.slice(0, Math.max(0, text.content.length - 15));
                    } else {
                      text.content = `${text.content}- Change ${change}: added a line of notes.\n`;
                    }
                  });
                }
                Obj.update(doc, (doc) => {
                  doc.title = `Release notes (session ${session + 1})`;
                });
                if (session < 2) {
                  // Exceed the coalescing window so the next session becomes a separate step.
                  yield* Effect.sleep(3_500);
                }
              }
            }),
        }),
      ],
    }),
  ],
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
