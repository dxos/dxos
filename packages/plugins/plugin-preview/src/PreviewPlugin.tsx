//
// Copyright 2023 DXOS.org
//

import React from 'react';

import {
  createIntent,
  Capabilities,
  contributes,
  Events,
  defineModule,
  definePlugin,
  LayoutAction,
  createSurface,
} from '@dxos/app-framework';
import { addEventListener } from '@dxos/async';
import { type Client } from '@dxos/client';
import { resolveRef } from '@dxos/client';
import { getSchema, isEchoObject, parseId, type ReactiveEchoObject, type Space } from '@dxos/client/echo';
import { isInstanceOf } from '@dxos/echo-schema';
import { DXN } from '@dxos/keys';
import { type DxRefTagActivate } from '@dxos/lit-ui';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client';
import { useTranslation } from '@dxos/react-ui';
import { type PreviewLinkRef, type PreviewLinkTarget } from '@dxos/react-ui-editor';
import { Form } from '@dxos/react-ui-form';
import { descriptionMessage } from '@dxos/react-ui-theme';
import { Testing } from '@dxos/schema/testing';

import { OrgCard } from './components';
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
        contributes(Capabilities.ReactSurface, [
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
          createSurface({
            id: `${PREVIEW_PLUGIN}/schema-popover`,
            role: 'popover',
            filter: (data): data is { subject: ReactiveEchoObject<Testing.Org> } =>
              isEchoObject(data.subject) && isInstanceOf(data.subject, Testing.Org),
            component: ({ data }) => <OrgCard subject={data.subject} />,
          }),
        ]),
    }),
  ]);
