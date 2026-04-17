//
// Copyright 2026 DXOS.org
//

/**
 * Linear plugin — minimal scaffold.
 *
 * Today: registers schemas (LinearWorkspace, LinearTeam, LinearIssue) so
 * Linear data can live in a DXOS space alongside Granola, Trello, GitHub,
 * and Slack. Exports a browser-side GraphQL client (`fetchRecentIssues`,
 * `whoAmI`) that any other plugin or demo script can drive.
 *
 * Intentionally left small — the purpose of this scaffold is to show that
 * adding a new work-tool integration to Composer is a weekend project,
 * not a months-long rewrite. Bigger features (real-time sync, blueprint
 * tools, triage UI) will land as follow-ups.
 */

import * as Option from 'effect/Option';

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Annotation } from '@dxos/echo';

import { meta } from './meta';
import { translations } from './translations';
import { Linear } from './types';

export const LinearPlugin = Plugin.define(meta).pipe(
  AppPlugin.addMetadataModule({
    metadata: [
      {
        id: Linear.LinearIssue.typename,
        metadata: {
          icon: Annotation.IconAnnotation.get(Linear.LinearIssue).pipe(Option.getOrThrow).icon,
          iconHue: Annotation.IconAnnotation.get(Linear.LinearIssue).pipe(Option.getOrThrow).hue ?? 'violet',
        },
      },
      {
        id: Linear.LinearTeam.typename,
        metadata: {
          icon: Annotation.IconAnnotation.get(Linear.LinearTeam).pipe(Option.getOrThrow).icon,
          iconHue: Annotation.IconAnnotation.get(Linear.LinearTeam).pipe(Option.getOrThrow).hue ?? 'violet',
        },
      },
      {
        id: Linear.LinearWorkspace.typename,
        metadata: {
          icon: Annotation.IconAnnotation.get(Linear.LinearWorkspace).pipe(Option.getOrThrow).icon,
          iconHue: Annotation.IconAnnotation.get(Linear.LinearWorkspace).pipe(Option.getOrThrow).hue ?? 'violet',
        },
      },
    ],
  }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);
