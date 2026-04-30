//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';
import React, { type ComponentProps, useMemo } from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useCapabilities } from '@dxos/app-framework/ui';
import { AppSurface, useActiveSpace } from '@dxos/app-toolkit/ui';
import { findAnnotation } from '@dxos/effect';
import { type FormFieldComponentProps, SelectField } from '@dxos/react-ui-form';

import { IntegrationAuthButton } from '#components';
import { IntegrationArticle, SyncTargetsChecklist } from '#containers';

import { SYNC_TARGETS_DIALOG } from '../constants';
import { OAUTH_PRESETS } from '../defs';
import { Integration, IntegrationSourceAnnotationId } from '../types';

import { IntegrationProvider } from './integration-provider';

const oauthSources = new Set(OAUTH_PRESETS.map((p) => p.source));

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'integration-article',
        filter: AppSurface.object(AppSurface.Article, Integration.Integration),
        component: ({ data, role }) => (
          <IntegrationArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      // Inline OAuth connect button used by inbox/calendar/etc. when they
      // detect a missing integration mid-flow. Independent of the
      // create-Integration dialog path.
      Surface.create({
        id: 'integration-auth',
        role: 'integration--auth',
        filter: (data): data is { source: string } => typeof data.source === 'string' && oauthSources.has(data.source),
        component: ({ data }) => {
          const space = useActiveSpace();
          if (!space) {
            return null;
          }
          return <IntegrationAuthButton source={data.source} db={space.db} />;
        },
      }),
      Surface.create({
        id: SYNC_TARGETS_DIALOG,
        filter: AppSurface.component<ComponentProps<typeof SyncTargetsChecklist>>(AppSurface.Dialog, SYNC_TARGETS_DIALOG),
        component: ({ data }) => <SyncTargetsChecklist {...data.props} />,
      }),
      // Form-input renderer for the Integration source selector. The
      // create-Integration form's `source` field carries
      // `IntegrationSourceAnnotationId`; this surface filters by that and
      // renders a dropdown populated from currently-registered
      // `IntegrationProvider` capabilities — so adding/removing a service
      // plugin updates the form without rebuilding the schema.
      Surface.create({
        id: 'integration-source-selector',
        role: 'form-input',
        filter: (data): data is { schema: Schema.Schema<any>; fieldPropertyAst?: SchemaAST.AST } => {
          const fieldAst = (data as any)?.fieldPropertyAst as SchemaAST.AST | undefined;
          if (!fieldAst) return false;
          const annotation = findAnnotation<boolean>(fieldAst, IntegrationSourceAnnotationId);
          return !!annotation;
        },
        component: ({ data: { fieldPropertyAst }, ...inputProps }) => {
          const providers = useCapabilities(IntegrationProvider).flat() as Array<{ source: string; label?: string }>;
          const options = useMemo(
            () => providers.map((provider) => ({ value: provider.source, label: provider.label ?? provider.source })),
            [providers],
          );
          if (!fieldPropertyAst) {
            return null;
          }
          const props = { ...inputProps, type: fieldPropertyAst } as any as FormFieldComponentProps;
          return <SelectField {...props} options={options} />;
        },
      }),
    ]),
  ),
);
