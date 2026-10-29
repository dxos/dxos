//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';
import * as InboxCapabilities from '@dxos/plugin-inbox/InboxCapabilities';
import * as MapCapabilities from '@dxos/plugin-map/MapCapabilities';
import * as MapEvents from '@dxos/plugin-map/MapEvents';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';
import { trim } from '@dxos/util';

import { TripNamespace } from './src/namespace.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: TripNamespace.key,
    name: 'Trip',
    author: 'DXOS',
    description: trim`
      Trip manages travel itineraries as local-first ECHO objects. A Trip is an
      ordered list of typed Segments - Flight, Train, Boat, Road, Lodging, and
      Activity - each of which may be linked to a Booking that carries the
      confirmation code, provider, passengers, price, and attached e-ticket
      files. Trips are browsable as Articles with a calendar mini-view and a
      SegmentStack companion surface, and can be embedded inside Markdown
      documents or queried by the existing Table and Map views without additional
      configuration.

      Phase 2 adds inbox integration via a generic MessageExtractor contract in
      plugin-inbox. plugin-trip registers a TripMessageExtractor that matches
      flight and hotel confirmation emails, parses them into Booking and Segment
      objects, and appends them to the relevant Trip in the user's space. The
      extractor runs in three modes: manually from a message action menu,
      agent-assisted via the inbox skill tool, and automatically on message
      arrival when opted in per Mailbox. All three modes funnel through the same
      ExtractMessage operation so behaviour is consistent regardless of how
      extraction was triggered.

      Booking and Segment provenance is tracked via ExtractedFrom ECHO relations
      that link each extracted object back to the source Message. Account objects
      record loyalty programme memberships and are deduplicated by provider domain
      and account number so the same frequent-flyer number is not created twice
      across separate confirmation emails from the same carrier.

      A TripCalendarSource contract (follow-up phase) will project Segments as
      CalendarEventLike values directly into calendar views without materialising
      separate CalendarEvent objects. Planned future work includes agent-backed
      extraction for providers without a deterministic parser, additional carrier
      coverage, and a SegmentRequest shape for multi-leg search input.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-trip',
    icon: { key: 'ph--airplane-takeoff--regular', hue: 'sky' },
    spec: 'PLUGIN.mdl',
    tags: ['labs', 'travel'],
  },
  modules: [
    AppCapability.appGraphBuilder(
      () => import('./src/capabilities/app-graph-builder.ts', { with: { type: 'module-url' } }),
      {
        requires: [AttentionCapabilities.ViewState],
      },
    ),
    SpaceCapability.createObject(() => import('./src/capabilities/create-object.ts', { with: { type: 'module-url' } })),
    // Browser-only: a `MarkerProvider` contributes a `useMarkers` React hook, and this one calls
    // `useMemo`/`useObject`/`useObjects` in its own body.
    Capability.lazyModule(
      'MarkerProvider',
      { provides: [MapCapabilities.MarkerProvider], activatesOn: MapEvents.Start, environments: ['browser', 'tauri'] },
      () => import('./src/capabilities/marker-provider.tsx', { with: { type: 'module-url' } }),
    ),
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
      {
        activatesOn: ActivationEvents.Idle,
      },
    ),
    AppCapability.pluginAsset({
      pluginId: TripNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: ['org.dxos.role.article', 'org.dxos.role.section'],
    }),
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } })),
    AppCapability.settings(() => import('./src/capabilities/settings.ts', { with: { type: 'module-url' } }), {
      activatesOn: ActivationEvents.Idle,
      requires: [Capabilities.AtomRegistry],
    }),
    Capability.lazyModule(
      'SkillDefinition',
      { provides: [AppCapabilities.SkillDefinition] },
      () => import('./src/capabilities/skill-definition.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
    Capability.lazyModule(
      'trip-extractor',
      { provides: [InboxCapabilities.ObjectExtractor] },
      () => import('./src/capabilities/trip-extractor.ts', { with: { type: 'module-url' } }),
    ),
  ],
});

export const { meta, make } = config;

export default config;
