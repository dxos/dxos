//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { DXN } from '@dxos/keys';

import { EntityExtractor, Researcher, Responder } from '../contracts/index.ts';
import { type DecideOptions } from '../processors/confidence.ts';
import { makeEntityExtractor } from '../processors/entities.ts';
import { type ResearchOptions, makeResearcher } from '../processors/research.ts';
import { makeResponder } from '../processors/responder.ts';
import * as SupportCapabilities from './SupportCapabilities.ts';

/** A plugin whose one contribution is a processor for the support pipeline. */
const processorPlugin = (key: string, name: string, provider: SupportCapabilities.AnyProvider) =>
  Plugin.define(Plugin.makeMeta({ key: DXN.make(key), name })).pipe(
    Plugin.addModule({
      id: `${key}.module.processor`,
      provides: [SupportCapabilities.Processor],
      activate: () => Effect.succeed([Capability.contribute(SupportCapabilities.Processor, provider)]),
    }),
    Plugin.make,
  )();

/** Extracts the sender's Person and Organization, matched against the ECHO graph. */
export const EntitiesPlugin = () => {
  const provider: SupportCapabilities.Provider<typeof EntityExtractor.EntityExtractor> = {
    contract: EntityExtractor.EntityExtractor,
    provide: makeEntityExtractor,
  };
  return processorPlugin('org.dxos.stories.support.plugin.entities', 'Support Entities', provider);
};

/** Researches the topics a question mentions in the space's canonical documents. */
export const ResearchPlugin = (options: ResearchOptions = {}) => {
  const provider: SupportCapabilities.Provider<typeof Researcher.Researcher> = {
    contract: Researcher.Researcher,
    provide: (host) => makeResearcher(host, options),
  };
  return processorPlugin('org.dxos.stories.support.plugin.research', 'Support Research', provider);
};

/** Drafts replies to questions the space's documents answer. */
export const ResponderPlugin = (options: DecideOptions = {}) => {
  const provider: SupportCapabilities.Provider<typeof Responder.Responder> = {
    contract: Responder.Responder,
    provide: (host) => makeResponder(host, options),
  };
  return processorPlugin('org.dxos.stories.support.plugin.responder', 'Support Responder', provider);
};
