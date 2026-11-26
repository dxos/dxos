//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Stream from 'effect/Stream';
import React, {
  type PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';

import { NoteStore, Summarizer } from '../contracts/index.ts';
import { HostController } from '../hosts/HostController.ts';
import notesPluginUrl from '../plugins/notes-plugin.ts?module-url';
import summarizerPluginUrl from '../plugins/summarizer-plugin.ts?module-url';
import { type Service, type ServiceHost } from '../services/index.ts';

/** Module URLs of the story's provider plugins; the same URL installs a plugin into any host. */
export const PLUGIN_URLS = { notes: notesPluginUrl, summarizer: summarizerPluginUrl } as const;

export type ServicesContextValue = {
  readonly controller: HostController;
  /** The consumer's clients: built once, and never rebuilt when a provider moves. */
  readonly notes: NoteStore.Client;
  readonly summarizer: Summarizer.Client;
};

const ServicesContext = createContext<ServicesContextValue | undefined>(undefined);

/** Owns the app host for the story, with the notes plugin installed as the app would have it. */
export const ServicesProvider = ({ children }: PropsWithChildren) => {
  const value = useMemo<ServicesContextValue>(() => {
    const controller = new HostController();
    return {
      controller,
      notes: controller.app.client(NoteStore.Contract),
      summarizer: controller.app.client(Summarizer.Contract),
    };
  }, []);

  useEffect(() => {
    void value.controller.install('app', PLUGIN_URLS.notes);
    return () => {
      void value.controller.dispose();
    };
  }, [value]);

  return <ServicesContext.Provider value={value}>{children}</ServicesContext.Provider>;
};

export const useServices = (): ServicesContextValue => {
  const value = useContext(ServicesContext);
  if (!value) {
    throw new Error('ServicesProvider is missing');
  }
  return value;
};

/** The app host's view of every host, binding and call. */
export const useSnapshot = (): ServiceHost.Snapshot => {
  const { controller } = useServices();
  return useSyncExternalStore(controller.app.subscribe, controller.app.getSnapshot);
};

/** The latest value of a service property, or `undefined` while no host provides it. */
export const useProperty = <A,>(property: Service.Property<A>): A | undefined => {
  const [value, setValue] = useState<A>();
  useEffect(() => {
    const fiber = Effect.runFork(
      Stream.runForEach(property.changes, (next) => Effect.sync(() => setValue(next))).pipe(Effect.ignore),
    );
    return () => {
      Effect.runFork(Fiber.interrupt(fiber));
    };
  }, [property]);
  return value;
};

/** A short label for where a contract is bound, as the modules show it. */
export const bindingLabel = (binding: ServiceHost.Binding | undefined): string =>
  binding === undefined ? 'no provider' : `${binding.kind} → ${binding.hostId}`;
