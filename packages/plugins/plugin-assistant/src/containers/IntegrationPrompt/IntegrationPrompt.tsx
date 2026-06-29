//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface, useCapabilities } from '@dxos/app-framework/ui';
import { useActiveSpace } from '@dxos/app-toolkit/ui';
import { Connector, ConnectorAuth, type ConnectorEntry } from '@dxos/plugin-connector';
import { Icon, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

export type IntegrationPromptProps = {
  /** Service the agent needs access to, e.g. `gmail.com`. */
  service?: string;
};

/**
 * Agent-facing connector prompt: rendered when the assistant needs a service the user has not yet
 * connected. Resolves the matching {@link Connector} entries for `service` and offers to connect via
 * the shared connector-auth surface, so the user can grant access inline instead of the agent failing
 * silently.
 */
export const IntegrationPrompt = ({ service }: IntegrationPromptProps) => {
  const { t } = useTranslation(meta.profile.key);
  const space = useActiveSpace();
  const connectors = useCapabilities(Connector).flat();
  const matched = useMemo(() => (service ? matchConnectors(connectors, service) : []), [connectors, service]);

  if (!service) {
    return null;
  }

  const label = matched[0]?.label ?? service;
  const connectorIds = matched.map((connector) => connector.id);

  return (
    <div role='group' className='flex flex-col gap-2 my-2 p-3 border border-subdued-separator rounded-sm'>
      <div className='flex items-center gap-2'>
        <Icon icon='ph--plugs--regular' size={5} classNames='shrink-0 text-subdued' />
        <div className='flex flex-col min-w-0'>
          <p className='text-sm font-medium truncate'>{t('integration-prompt.title', { service: label })}</p>
          <p className='text-sm text-subdued'>
            {connectorIds.length > 0
              ? t('integration-prompt.description', { service: label })
              : t('integration-prompt.unavailable', { service: label })}
          </p>
        </div>
      </div>
      {connectorIds.length > 0 && space && (
        <div className='flex justify-end'>
          <Surface.Surface type={ConnectorAuth} data={{ connectorIds }} limit={1} />
        </div>
      )}
    </div>
  );
};

/**
 * Connectors whose id, source, or label relate to the requested service. Matches on the service's
 * leading token (e.g. `gmail` from `gmail.com`) so model-supplied hostnames resolve to connectors
 * keyed by short id or provider domain.
 */
const matchConnectors = (connectors: ConnectorEntry[], service: string): ConnectorEntry[] => {
  const needle = service.toLowerCase();
  const base = needle.split(/[.@/]/)[0];
  return connectors.filter((connector) => {
    const candidates = [connector.id, connector.source, connector.label]
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.toLowerCase());
    return candidates.some((value) => value === needle || value === base || value.includes(base));
  });
};
