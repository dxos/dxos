//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Result from 'effect/Result';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import { log } from '@dxos/log';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { meta } from '#meta';
import { SpaceOperation } from '#types';

import { TemplateApplyError, TemplateNotFoundError } from '../errors.ts';
import { pluginsToEnable } from '../util/index.ts';

/**
 * Enables the plugins a template's content renders with; choosing the template is the consent, so the toast reports
 * what came on rather than asking.
 */
const enableTemplatePlugins = Effect.fnUntraced(function* (template: AppCapabilities.SpaceTemplate) {
  const manager = yield* Plugin.Service;
  const installed = new Map(manager.getPlugins().map(({ meta: plugin }) => [plugin.profile.key, plugin.profile.name]));
  const { enable, unavailable } = pluginsToEnable(template, { installed, enabled: new Set(manager.getEnabled()) });
  if (unavailable.length > 0) {
    log.warn('template needs plugins this host does not have', { template: template.id, unavailable });
  }
  const enabled: string[] = [];
  for (const id of enable) {
    const result = yield* manager.enable(id).pipe(Effect.result);
    if (Result.isSuccess(result)) {
      enabled.push(installed.get(id) ?? id);
    } else {
      log.warn('failed to enable template plugin', { template: template.id, id, error: result.failure });
    }
  }
  if (enabled.length > 0) {
    yield* Operation.invoke(LayoutOperation.AddToast, {
      id: `${meta.profile.key}/template-plugins-enabled`,
      title: ['template-plugins-enabled-toast.title', { ns: meta.profile.key }],
      // Label tuples carry no interpolation values, and plugin names are proper nouns that need no translation.
      description: enabled.join(', '),
      icon: 'ph--plugs-connected--regular',
    }).pipe(Effect.catch((error) => Effect.sync(() => log.warn('failed to add toast', { error }))));
  }
});

const handler: Operation.WithHandler<typeof SpaceOperation.ApplyTemplate> = SpaceOperation.ApplyTemplate.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ template, space }) {
      yield* Plugin.activate(ActivationEvents.SpaceTemplatesRequested);
      const templates = yield* Capability.getAll(AppCapabilities.SpaceTemplate);
      const match = templates.find(({ id }) => id === template);
      if (!match) {
        return yield* Effect.fail(new TemplateNotFoundError({ context: { template } }));
      }

      // Before the content is written, so its objects open in the plugins that render them.
      yield* enableTemplatePlugins(match);
      const client = yield* Capability.get(ClientCapabilities.Client);
      yield* match
        .apply({ client, space })
        .pipe(Effect.mapError((cause) => new TemplateApplyError({ context: { template, spaceId: space.id }, cause })));
    }),
  ),
);

export default handler;
