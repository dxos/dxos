//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { type Resource, addResources, translator } from '@dxos/i18n';
import { osTranslations } from '@dxos/ui-theme';

import { translations } from '#translations';

export type TranslatorModuleOptions = {
  appName?: string;
  resourceExtensions?: Resource[];
};

/**
 * Registers all contributed translations into the framework-agnostic i18next instance and exposes
 * the {@link AppCapabilities.Translator} capability. The i18next instance lifecycle is owned by
 * `@dxos/i18n`; this module is the single place where resource bundles are registered so both React
 * and non-React consumers read the same translations.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* ({ appName, resourceExtensions = [] }: TranslatorModuleOptions = {}) {
    const registry = yield* Capabilities.AtomRegistry;
    const translationsAtom = yield* Capability.atom(AppCapabilities.Translations);

    // Static resources owned by the theme plugin and the embedding app.
    addResources([
      ...translations,
      ...resourceExtensions,
      ...(appName ? [{ 'en-US': { [osTranslations]: { 'current-app.name': appName } } }] : []),
    ]);

    // Plugin-contributed translations, registered reactively as plugins are enabled and disabled —
    // the live contributions view means late (legacy-window) contributions still land.
    const register = () => addResources(registry.get(translationsAtom).flat());
    register();
    const unsubscribe = registry.subscribe(translationsAtom, register);

    return Capability.provide(AppCapabilities.Translator, translator, () => Effect.sync(() => unsubscribe()));
  }),
);
