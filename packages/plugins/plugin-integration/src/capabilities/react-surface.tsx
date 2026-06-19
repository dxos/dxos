//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { type ComponentProps, useMemo } from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useCapabilities } from '@dxos/app-framework/ui';
import { AppSurface, useActiveSpace } from '@dxos/app-toolkit/ui';
import { SchemaEx } from '@dxos/effect';
import { type FormFieldRendererProps, SelectField } from '@dxos/react-ui-form';

import { IntegrationAuthButton } from '#components';
import { CustomTokenDialog, IntegrationArticle, IntegrationSettingsArticle, SyncTargetsDialog } from '#containers';
import { Integration, IntegrationAuth, IntegrationProvider, IntegrationProviderAnnotationId } from '#types';

import { INTEGRATIONS_SECTION_TYPE, PROVIDER_FORM_DIALOG, SYNC_TARGETS_DIALOG } from '../constants';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'integrationsSectionArticle',
        filter: AppSurface.literal(AppSurface.Article, INTEGRATIONS_SECTION_TYPE),
        component: () => <IntegrationSettingsArticle />,
      }),
      Surface.create({
        id: 'integrationArticle',
        filter: AppSurface.object(AppSurface.Article, Integration.Integration),
        component: ({ data, role }) => (
          <IntegrationArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      Surface.create({
        id: 'integrationAuth',
        filter: Surface.makeFilter(IntegrationAuth, (data) => typeof data.providerId === 'string'),
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
        id: 'syncTargetsDialog',
        filter: AppSurface.component<ComponentProps<typeof SyncTargetsDialog>>(AppSurface.Dialog, SYNC_TARGETS_DIALOG),
        component: ({ data }) => <SyncTargetsDialog {...data.props} />,
      }),
      Surface.create({
        id: 'customTokenDialog',
        filter: AppSurface.component<ComponentProps<typeof CustomTokenDialog>>(AppSurface.Dialog, PROVIDER_FORM_DIALOG),
        component: ({ data }) => <CustomTokenDialog {...data.props} />,
      }),
      Surface.create({
        id: 'integrationProviderSelector',
        filter: AppSurface.formInputByField(
          (ast) => !!SchemaEx.findAnnotation<boolean>(ast, IntegrationProviderAnnotationId),
        ),
        component: ({ data: { fieldPropertyAst }, ...inputProps }) => {
          const providers = useCapabilities(IntegrationProvider).flat();
          const options = useMemo(
            () => providers.map((provider) => ({ value: provider.id, label: provider.label ?? provider.id })),
            [providers],
          );
          if (!fieldPropertyAst) {
            return null;
          }
          const props = { ...inputProps, type: fieldPropertyAst } as any as FormFieldRendererProps;
          return <SelectField {...props} options={options} />;
        },
      }),
    ]),
  ),
);
