//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, getSpacePath } from '@dxos/app-toolkit';
import { useActiveSpace } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Type } from '@dxos/echo';
import { SpaceOperation } from '@dxos/plugin-space';
import { useQuery } from '@dxos/react-client/echo';
import { Button, useTranslation } from '@dxos/react-ui';
import { Settings } from '@dxos/react-ui-form';
import { Listbox } from '@dxos/react-ui-list';

import { meta } from '#meta';

import { integrationDeckSubject } from '../../constants';
import { Integration } from '../../types';

export type IntegrationSettingsArticleProps = Record<string, never>;

export const IntegrationSettingsArticle = (_props: IntegrationSettingsArticleProps) => {
  const { t } = useTranslation(meta.id);
  const space = useActiveSpace();
  const { invokePromise } = useOperationInvoker();
  const integrations = useQuery(space?.db, Filter.type(Integration.Integration));

  const handleAdd = useCallback(() => {
    if (!space) {
      return;
    }
    void invokePromise(SpaceOperation.OpenCreateObject, {
      target: space.db,
      typename: Type.getTypename(Integration.Integration),
    });
  }, [space, invokePromise]);

  const handleSelect = useCallback(
    (integration: Integration.Integration) => {
      const db = Obj.getDatabase(integration);
      if (!db) {
        return;
      }
      void invokePromise(LayoutOperation.Open, {
        subject: [integrationDeckSubject(getSpacePath(db.spaceId), integration.id)],
        navigation: 'immediate',
      });
    },
    [invokePromise],
  );

  return (
    <Settings.Viewport>
      <Settings.Section title=''>
        <Settings.Item
          title={t('add-integration.label', { defaultValue: 'Add integration' })}
          description={t('connect-service.description', {
            defaultValue: 'Link an external service to this space.',
          })}
        >
          <Button onClick={handleAdd}>{t('connect.label', { defaultValue: 'Connect' })}</Button>
        </Settings.Item>
      </Settings.Section>

      {integrations.length > 0 && (
        <Settings.Section title={t('integrations.label', { defaultValue: 'Integrations' })}>
          <Listbox.Root>
            <Listbox.Viewport>
              <Listbox.Content aria-label={t('integrations.label', { defaultValue: 'Integrations' })}>
                {integrations.map((integration) => {
                  const accessToken = integration.accessToken?.target;
                  const label =
                    integration.name ??
                    (accessToken
                      ? `${accessToken.source}${accessToken.account ? ` · ${accessToken.account}` : ''}`
                      : (integration.providerId ?? integration.id));
                  return (
                    <Listbox.Item
                      key={integration.id}
                      id={integration.id}
                      classNames='cursor-pointer'
                      onClick={() => handleSelect(integration)}
                    >
                      <span className='truncate'>{label}</span>
                    </Listbox.Item>
                  );
                })}
              </Listbox.Content>
            </Listbox.Viewport>
          </Listbox.Root>
        </Settings.Section>
      )}
    </Settings.Viewport>
  );
};
