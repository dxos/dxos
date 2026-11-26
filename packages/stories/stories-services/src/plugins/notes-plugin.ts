//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { DXN } from '@dxos/keys';

import { NoteStore } from '../contracts/index.ts';
import { Service, ServiceHost, State } from '../services/index.ts';

const STORAGE_KEY = 'org.dxos.stories.services.notes';

const meta = Plugin.makeMeta({ key: DXN.make('org.dxos.stories.services.plugin.notes'), name: 'Notes' });

const read = (storage: NoteStore.Storage): NoteStore.Note[] => {
  const stored = storage.getItem(STORAGE_KEY);
  const parsed: unknown = stored === null ? [] : JSON.parse(stored);
  return Array.isArray(parsed) ? parsed : [];
};

const provider = Service.provide(NoteStore.Contract, {
  needs: [NoteStore.STORAGE_FEATURE],
  make: ({ feature }) =>
    Effect.sync(() => {
      const storage = feature<NoteStore.Storage>(NoteStore.STORAGE_FEATURE);
      const count = State.cell(read(storage).length);
      const added = State.emitter<NoteStore.Note>();
      const write = (notes: NoteStore.Note[]) => {
        storage.setItem(STORAGE_KEY, JSON.stringify(notes));
        count.set(notes.length);
      };
      const store: NoteStore.Client = {
        put: ({ text }) =>
          Effect.sync(() => {
            const notes = read(storage);
            const note = { id: `note-${notes.length + 1}`, text };
            write([...notes, note]);
            added.emit(note);
            return note;
          }),
        list: () => Effect.sync(() => read(storage)),
        clear: () => Effect.sync(() => write([])),
        count: count.property,
        added: added.stream,
      };
      return store;
    }),
});

/** Provides `NoteStore` wherever the host has local storage. */
const NotesPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'provider',
    provides: [ServiceHost.Provider],
    activatesOn: ActivationEvents.Startup,
    activate: () => Effect.succeed([Capability.contribute(ServiceHost.Provider, provider)]),
  }),
  Plugin.make,
);

export default NotesPlugin;
