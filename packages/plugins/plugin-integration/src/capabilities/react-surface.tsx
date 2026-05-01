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
import { CustomTokenDialog, IntegrationArticle, SyncTargetsChecklist } from '#containers';
import {
  Integration,
  IntegrationProvider,
  IntegrationProviderAnnotationId,
  type IntegrationProviderEntry,
} from '#types';

import { CUSTOM_TOKEN_DIALOG, SYNC_TARGETS_DIALOG } from '../constants';

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
      Surface.create({
        id: 'integration-auth',
        role: 'integration--auth',
        filter: (
          data,
        ): data is {
          providerId: string;
          existingTarget?: ComponentProps<typeof IntegrationAuthButton>['existingTarget'];
        } => typeof (data as any).providerId === 'string',
        component: ({ data }) => {
          const space = useActiveSpace();
          if (!space) {
            return null;
          }
          return (
            <IntegrationAuthButton providerId={data.providerId} db={space.db} existingTarget={data.existingTarget} />
          );
        },
      }),
      Surface.create({
        id: SYNC_TARGETS_DIALOG,
        filter: AppSurface.component<ComponentProps<typeof SyncTargetsChecklist>>(
          AppSurface.Dialog,
          SYNC_TARGETS_DIALOG,
        ),
        component: ({ data }) => <SyncTargetsChecklist {...data.props} />,
      }),
      Surface.create({
        id: CUSTOM_TOKEN_DIALOG,
        filter: AppSurface.component<ComponentProps<typeof CustomTokenDialog>>(AppSurface.Dialog, CUSTOM_TOKEN_DIALOG),
        component: ({ data }) => <CustomTokenDialog {...data.props} />,
      }),
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
          const providers = useCapabilities(IntegrationProvider).flat() as IntegrationProviderEntry[];
          const options = useMemo(
            () => providers.map((provider) => ({ value: provider.id, label: provider.label ?? provider.id })),
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
