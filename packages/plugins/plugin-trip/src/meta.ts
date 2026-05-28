//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: DXN.make('org.dxos.plugin.trip'),
  name: 'Trip',
  author: 'DXOS',
  description: trim`
    Trip manages travel itineraries as local-first ECHO objects. A Trip is an
    ordered list of typed Segments — Flight, Train, Boat, Road, Lodging, and
    Activity — each of which may be linked to a Booking that carries the
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
    agent-assisted via the inbox blueprint tool, and automatically on message
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
  icon: 'ph--airplane-takeoff--regular',
  iconHue: 'sky',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-trip',
  spec: 'PLUGIN.mdl',
  version: '0.8.3',
  tags: ['travel'],
};
