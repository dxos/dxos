//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import { useActiveSpace } from '@dxos/app-toolkit/ui';
import { type Database, Filter } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { Connection } from '@dxos/link';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';
import { Flex, Icon, useTranslation } from '@dxos/react-ui';

import { ConnectorAuthMenu } from '#components';
import { meta } from '#meta';

import { useChatReportContext } from '../../components/Chat/context';

const INTEGRATION_PROMPT_NAME = 'IntegrationPrompt';

export type IntegrationPromptProps = {
  /** Service the agent needs access to, e.g. `gmail.com`. */
  service?: string;
  /** Permissions the credential must grant, e.g. `['Contents: read and write']`. */
  scopes?: string[];
  /** One sentence on why the agent needs the service. */
  reason?: string;
};

/**
 * Agent-facing connector prompt: rendered when the assistant needs a service the user has not yet
 * connected. Resolves the matching {@link ConnectorSpec.Connector} entries for `service` and offers to connect via
 * the shared connector-auth menu, so the user can grant access inline instead of the agent failing
 * silently.
 */
export const IntegrationPrompt = ({ service, scopes, reason }: IntegrationPromptProps) => {
  const { t } = useTranslation(meta.profile.key);
  const space = useActiveSpace();
  const connectors = useCapabilities(ConnectorSpec.Connector).flat();
  const matched = useMemo(() => (service ? matchConnectors(connectors, service) : []), [connectors, service]);
  const connectorIds = useMemo(() => matched.map((connector) => connector.id), [matched]);
  const label = matched[0]?.label ?? service;
  const { armReport } = useReportConnection({ connectorIds, db: space?.db, label });

  if (!service) {
    return null;
  }

  return (
    <Flex role='group' column gap='sm' classNames='my-2 p-3 border border-subdued-separator rounded-sm'>
      <Flex gap='sm' align='center'>
        <Icon icon='ph--plugs--regular' size={5} classNames='shrink-0 text-subdued' />
        <Flex column classNames='min-w-0'>
          <p className='text-sm font-medium truncate'>{t('integration-prompt.title', { service: label })}</p>
          <p className='text-sm text-subdued'>
            {/* With no connector matched, nothing can satisfy the request, so the unavailable
                message outranks the agent's reason. */}
            {connectorIds.length > 0
              ? (reason ?? t('integration-prompt.description', { service: label }))
              : t('integration-prompt.unavailable', { service: label })}
          </p>
        </Flex>
      </Flex>
      {scopes && scopes.length > 0 && (
        <div>
          <p className='text-sm text-subdued'>{t('integration-prompt.scopes')}</p>
          <ul className='text-sm text-subdued list-disc list-inside'>
            {scopes.map((scope) => (
              <li key={scope}>{scope}</li>
            ))}
          </ul>
        </div>
      )}
      {connectorIds.length > 0 && (
        <Flex justify='end'>
          <ConnectorAuthMenu connectorIds={connectorIds} db={space?.db} onSelect={armReport} />
        </Flex>
      )}
    </Flex>
  );
};

type UseReportConnectionOptions = {
  connectorIds: readonly string[];
  db: Database.Database | undefined;
  /** Human-readable service name used in the report, e.g. `Anthropic`. */
  label: string | undefined;
};

/**
 * Reports a completed connect flow back into the conversation as a user turn naming the new
 * credential's URI, so the agent — which cannot observe a click, and whose flows finish out of band
 * in an OAuth popup or a credential dialog — resumes with the credential it asked for.
 *
 * Armed by the user picking an entry rather than by mount: the connection query starts empty and
 * fills in asynchronously, so a mount-time baseline could not tell a pre-existing connection from
 * one this flow created. A flow whose prompt unmounts before it finishes goes unreported.
 */
const useReportConnection = ({ connectorIds, db, label }: UseReportConnectionOptions) => {
  const { submit } = useChatReportContext(INTEGRATION_PROMPT_NAME);
  const connections = useQuery(db, Filter.type(Connection.Connection));
  const matched = useMemo(
    () => connections.filter((connection) => !!connection.connectorId && connectorIds.includes(connection.connectorId)),
    [connections, connectorIds],
  );
  // Ids present when the user started the flow; anything beyond them is what the flow produced.
  const baseline = useRef<Set<string> | undefined>(undefined);

  const armReport = useCallback(() => {
    baseline.current = new Set(matched.map((connection) => connection.id));
  }, [matched]);

  useEffect(() => {
    if (!baseline.current) {
      return;
    }
    const created = matched.find((connection) => !baseline.current?.has(connection.id));
    if (!created) {
      return;
    }
    // One report per flow: disarm before submitting so a later connection needs a fresh click.
    baseline.current = undefined;
    submit(`Connected ${label ?? created.connectorId}. Credential: ${created.accessToken.uri}`);
  }, [matched, label, submit]);

  return { armReport };
};

/**
 * Connectors whose id, source, or label relate to the requested service. Matches on the service's
 * leading token (e.g. `gmail` from `gmail.com`) so model-supplied hostnames resolve to connectors
 * keyed by short id or provider domain.
 */
const matchConnectors = (
  connectors: ConnectorSpec.ConnectorEntry[],
  service: string,
): ConnectorSpec.ConnectorEntry[] => {
  const needle = service.trim().toLowerCase();
  // A malformed service (e.g. `.gmail.com` or `/`) can yield an empty base token, which would make
  // `value.includes(base)` match every connector; bail so the unavailable state is shown instead.
  const base = needle.split(/[.@/]/)[0];
  if (!needle || !base) {
    return [];
  }
  return connectors.filter((connector) => {
    const candidates = [connector.id, connector.source, connector.label]
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.toLowerCase());
    return candidates.some((value) => value === needle || value === base || value.includes(base));
  });
};

IntegrationPrompt.displayName = 'IntegrationPrompt';
