//
// Copyright 2025 DXOS.org
//

import { pipe } from 'effect';
import React, { useCallback, useEffect, useRef } from 'react';

import { chain, createIntent, LayoutAction, useIntentDispatcher } from '@dxos/app-framework';
import { getSnapshot } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { SpaceAction } from '@dxos/plugin-space/types';
import { type OAuthFlowResult } from '@dxos/protocols';
import { useClient } from '@dxos/react-client';
import { live, Filter, type Space, useQuery, makeRef } from '@dxos/react-client/echo';
import { List, useTranslation } from '@dxos/react-ui';
import { ControlSection } from '@dxos/react-ui-form';
import { StackItem } from '@dxos/react-ui-stack';
import { DataType } from '@dxos/schema';

import { ADD_TOKEN_DIALOG } from './AddTokenDialog';
import { IntegrationItem } from './IntegrationItem';
import { IntegrationRegistry } from './IntegrationRegistry';
import { INTEGRATION_PLUGIN } from '../meta';
import { IntegrationAction, IntegrationType, type IntegrationDefinition } from '../types';

export const IntegrationsContainer = ({ space }: { space: Space }) => {
  const { t } = useTranslation(INTEGRATION_PLUGIN);
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const client = useClient();
  const integrations = useQuery(space, Filter.schema(IntegrationType));
  const integrationsRef = useRef<Record<string, IntegrationType>>({});

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      const edgeUrl = new URL(client.edge.baseUrl);
      if (event.origin === edgeUrl.origin) {
        const data = event.data as OAuthFlowResult;
        if (data.success) {
          const integration = integrationsRef.current[data.accessTokenId];
          if (integration?.accessToken?.target) {
            integration.accessToken.target.token = data.accessToken;
            void dispatch(
              pipe(
                createIntent(SpaceAction.AddObject, { object: integration, target: space, hidden: true }),
                chain(IntegrationAction.IntegrationCreated),
              ),
            );
          } else {
            log.warn('token object not found', data);
          }
        } else {
          log.warn('oauth flow failed', data);
        }
      }
    };

    window.addEventListener('message', listener);
    return () => {
      window.removeEventListener('message', listener);
    };
  }, [space, client]);

  const handleConfigure = useCallback(
    async (definition: IntegrationDefinition) => {
      if (definition.auth?.kind === 'oauth') {
        const token = live(DataType.AccessToken, {
          source: definition.auth.source,
          note: definition.auth.note,
          token: '',
        });
        const integration = live(IntegrationType, {
          serviceId: definition.serviceId,
          accessToken: makeRef(token),
        });
        integrationsRef.current[token.id] = integration;

        const { authUrl } = await client.edge.initiateOAuthFlow({
          provider: definition.auth.provider,
          scopes: definition.auth.scopes as string[],
          spaceId: space.id,
          accessTokenId: token.id,
        });

        log.info('open', { authUrl });

        window.open(authUrl, 'oauthPopup', 'width=500,height=600');
      } else {
        await dispatch(
          createIntent(LayoutAction.UpdateDialog, {
            part: 'dialog',
            subject: ADD_TOKEN_DIALOG,
            options: {
              blockAlign: 'center',
              // TODO(wittjosiah): This needs to be snapshot because its a static object thats converted to live.
              props: { space, definition: getSnapshot(definition) },
            },
          }),
        );
      }
    },
    [space, client, dispatch],
  );

  const handleRemove = useCallback(
    (integration: IntegrationType) =>
      dispatch(
        createIntent(SpaceAction.RemoveObjects, {
          objects: [integration, integration.accessToken?.target],
        }),
      ),
    [dispatch],
  );

  return (
    <StackItem.Content classNames='block overflow-y-auto'>
      <ControlSection title={t('integrations verbose label')} description={t('integrations description')}>
        <List classNames='container-max-width grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] auto-rows-[10rem] gap-3 p-3'>
          {integrations.map((integration) => (
            <IntegrationItem key={integration.id} integration={integration} onRemove={handleRemove} />
          ))}
        </List>
      </ControlSection>
      <ControlSection title={t('integrations registry label')} description={t('integrations registry description')}>
        <IntegrationRegistry onConfigure={handleConfigure} />
      </ControlSection>
    </StackItem.Content>
  );
};
