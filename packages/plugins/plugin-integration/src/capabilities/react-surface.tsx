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
import { Integration, IntegrationProviderAnnotationId } from '../types';

import { IntegrationProvider, type IntegrationProvider as IntegrationProviderType } from './integration-provider';

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
      // create-Integration dialog path. Caller passes `providerId` to
      // select a specific provider entry — needed because multiple
      // providers can share the same OAuth domain (Gmail / Calendar).
      Surface.create({
        id: 'integration-auth',
        role: 'integration--auth',
        filter: (data): data is { providerId: string } => typeof (data as any).providerId === 'string',
        component: ({ data }) => {
          const space = useActiveSpace();
          if (!space) {
            return null;
          }
          return <IntegrationAuthButton providerId={data.providerId} db={space.db} />;
        },
      }),
      Surface.create({
        id: SYNC_TARGETS_DIALOG,
        filter: AppSurface.component<ComponentProps<typeof SyncTargetsChecklist>>(AppSurface.Dialog, SYNC_TARGETS_DIALOG),
        component: ({ data }) => <SyncTargetsChecklist {...data.props} />,
      }),
      // Form-input renderer for the Integration provider selector. The
      // create-Integration form's `providerId` field carries
      // `IntegrationProviderAnnotationId`; this surface filters by that and
      // renders a dropdown populated from currently-registered
      // `IntegrationProvider` capabilities — so adding/removing a service
      // plugin updates the form without rebuilding the schema.
      Surface.create({
        id: 'integration-provider-selector',
        role: 'form-input',
        filter: (data): data is { schema: Schema.Schema<any>; fieldPropertyAst?: SchemaAST.AST } => {
          const fieldAst = (data as any)?.fieldPropertyAst as SchemaAST.AST | undefined;
          if (!fieldAst) return false;
          const annotation = findAnnotation<boolean>(fieldAst, IntegrationProviderAnnotationId);
          return !!annotation;
        },
        component: ({ data: { fieldPropertyAst }, ...inputProps }) => {
          const providers = useCapabilities(IntegrationProvider).flat() as IntegrationProviderType[];
          const options = useMemo(
            () =>
              providers
                // Only providers with an OAuth flow can be created from the
                // dialog. Listing-only providers (no `oauth`) are filtered.
                .filter((provider) => provider.oauth)
                .map((provider) => ({ value: provider.id, label: provider.label ?? provider.id })),
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
