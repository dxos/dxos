//
// Copyright 2023 DXOS.org
//

import React, { useCallback } from 'react';

import {
  Capabilities,
  Events,
  LayoutAction,
  Surface,
  contributes,
  createIntent,
  createSurface,
  defineModule,
  definePlugin,
  useIntentDispatcher,
} from '@dxos/app-framework';
import { addEventListener } from '@dxos/async';
import { type Client, resolveRef } from '@dxos/client';
import {
  Filter,
  fullyQualifiedId,
  getSchema,
  getSpace,
  isEchoObject,
  parseId,
  type ReactiveEchoObject,
  type Space,
} from '@dxos/client/echo';
import { isInstanceOf } from '@dxos/echo-schema';
import { DXN } from '@dxos/keys';
import { type DxRefTagActivate } from '@dxos/lit-ui';
import { log } from '@dxos/log';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { useTranslation } from '@dxos/react-ui';
import { type PreviewLinkRef, type PreviewLinkTarget } from '@dxos/react-ui-editor';
import { Form } from '@dxos/react-ui-form';
import { TableType } from '@dxos/react-ui-table';
import { descriptionMessage } from '@dxos/react-ui-theme';
import { Contact, Organization, Project } from '@dxos/schema';

import { ContactCard, OrganizationCard, ProjectCard } from './components';
import { meta, PREVIEW_PLUGIN } from './meta';
import translations from './translations';

const customEventOptions = { capture: true, passive: false };

const handlePreviewLookup = async (
  client: Client,
  defaultSpace: Space,
  { ref, label }: PreviewLinkRef,
): Promise<PreviewLinkTarget | null> => {
  const dxn = DXN.parse(ref);
  if (!dxn) {
    return null;
  }

  const object = await resolveRef(client, dxn, defaultSpace);
  return { label, object };
};

export const PreviewPlugin = () =>
  definePlugin(meta, [
    defineModule({
      id: `${meta.id}/module/translations`,
      activatesOn: Events.SetupTranslations,
      activate: () => contributes(Capabilities.Translations, translations),
    }),
    defineModule({
      id: `${meta.id}/module/schema`,
      activatesOn: ClientEvents.SetupSchema,
      activate: () => [contributes(ClientCapabilities.Schema, [Contact, Organization])],
    }),
    defineModule({
      id: `${meta.id}/module/preview-popover`,
      activatesOn: Events.Startup,
      activate: (context) => {
        // TODO(wittjosiah): Factor out lookup handlers to other plugins to make not ECHO-specific.
        const handleDxRefTagActivate = async ({ ref, label, trigger }: DxRefTagActivate) => {
          const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher);
          const client = context.requestCapability(ClientCapabilities.Client);
          const [layout] = context.requestCapabilities(Capabilities.Layout);
          const { spaceId } = parseId(layout.workspace);
          const space = (spaceId && client.spaces.get(spaceId)) ?? client.spaces.default;
          const result = await handlePreviewLookup(client, space, { ref, label });
          if (!result) {
            return;
          }

          await dispatch(
            createIntent(LayoutAction.UpdatePopover, {
              part: 'popover',
              subject: result.object,
              options: {
                state: true,
                variant: 'virtual',
                anchor: trigger,
              },
            }),
          );
        };

        if (!document.defaultView) {
          log.warn('No default view found');
          return [];
        }

        const cleanup = addEventListener(
          document.defaultView,
          'dx-ref-tag-activate',
          handleDxRefTagActivate,
          customEventOptions,
        );
        return contributes(Capabilities.Null, null, () => cleanup());
      },
    }),
    defineModule({
      id: `${meta.id}/module/react-surface`,
      activatesOn: Events.SetupReactSurface,
      activate: () =>
        // TODO(wittjosiah): Factor out to lazy capabilities like other plugins.
        contributes(Capabilities.ReactSurface, [
          //
          // Specific schema types.
          //
          createSurface({
            id: `${PREVIEW_PLUGIN}/schema-popover`,
            role: 'popover',
            filter: (data): data is { subject: Contact } => isInstanceOf(Contact, data.subject),
            component: ({ data }) => {
              const { dispatchPromise: dispatch } = useIntentDispatcher();
              const handleOrgClick = useCallback(
                async (org: Organization) => {
                  const space = getSpace(org);
                  const tablesQuery = await space?.db.query(Filter.schema(TableType)).run();
                  const currentSpaceOrgTable = tablesQuery?.objects.find((table) => {
                    return table.view?.target?.query?.typename === Organization.typename;
                  });
                  if (currentSpaceOrgTable) {
                    return dispatch(
                      createIntent(LayoutAction.Open, {
                        part: 'main',
                        subject: [fullyQualifiedId(currentSpaceOrgTable)],
                        options: { workspace: space?.id },
                      }),
                    );
                  }
                },
                [dispatch],
              );
              return (
                <ContactCard subject={data.subject} onOrgClick={handleOrgClick}>
                  <Surface role='related' data={data} />
                </ContactCard>
              );
            },
          }),
          createSurface({
            id: `${PREVIEW_PLUGIN}/schema-popover`,
            role: 'popover',
            filter: (data): data is { subject: Organization } => isInstanceOf(Organization, data.subject),
            component: ({ data }) => (
              <OrganizationCard subject={data.subject}>
                <Surface role='related' data={data} />
              </OrganizationCard>
            ),
          }),
          createSurface({
            id: `${PREVIEW_PLUGIN}/schema-popover`,
            role: 'popover',
            filter: (data): data is { subject: Project } => isInstanceOf(Project, data.subject),
            component: ({ data }) => <ProjectCard subject={data.subject} />,
          }),

          //
          // Fallback for any object.
          //
          createSurface({
            id: `${PREVIEW_PLUGIN}/fallback-popover`,
            role: 'popover',
            position: 'fallback',
            filter: (data): data is { subject: ReactiveEchoObject<any> } => isEchoObject(data.subject),
            component: ({ data }) => {
              const schema = getSchema(data.subject);
              const { t } = useTranslation(PREVIEW_PLUGIN);
              if (!schema) {
                return <p className={descriptionMessage}>{t('unable to create preview message')}</p>;
              }

              return <Form schema={schema} values={data.subject} readonly />;
            },
          }),
        ]),
    }),
  ]);
