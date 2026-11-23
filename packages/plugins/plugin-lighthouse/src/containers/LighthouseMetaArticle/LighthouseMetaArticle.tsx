//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useCallback, useEffect, useState } from 'react';

import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as EffectEx from '@dxos/effect/EffectEx';
import { Connection } from '@dxos/link';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Status from '@dxos/react-ui/Status';

import {
  type Issue,
  type IssueStatus,
  type LighthouseClient,
  type Plugin,
  type Predicate,
  type StorageReport,
} from '#client';
import { meta } from '#meta';

import {
  LighthouseMeta,
  type MetaTab,
  type PruneReport,
  formatBytes,
  readPrune,
} from '../../components/LighthouseMeta/index.ts';
import { useConnectionClient } from '../../hooks/useConnectionClient.ts';

export type LighthouseMetaArticleProps = AppSurface.ArticleProps<unknown, { defaultTab?: MetaTab }, unknown>;

type Loaded = {
  plugins?: Plugin[];
  predicates?: Predicate[];
  issues?: Issue[];
  storage?: StorageReport;
  prune?: PruneReport;
};

/** Runs a read; a failure becomes its message, so one route that is down leaves the other tabs readable. */
const attempt = <A,>(effect: Effect.Effect<A, Error>) =>
  EffectEx.runPromise(
    effect.pipe(
      Effect.map((value) => ({ value }) as const),
      Effect.catch((error) => Effect.succeed({ error: error.message } as const)),
    ),
  );

const isConnection = (value: unknown): value is Connection.Connection => Connection.instanceOf(value);

/**
 * Lighthouse's own state for one connection: plugins, vocabulary, issues (triage writes back) and storage. Takes the
 * Connection as its subject, or as what it is a companion to.
 */
export const LighthouseMetaArticle = ({ role, subject, companionTo, defaultTab }: LighthouseMetaArticleProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const connection = isConnection(subject) ? subject : isConnection(companionTo) ? companionTo : undefined;
  const client = useConnectionClient(connection);
  const [loaded, setLoaded] = useState<Loaded>({});
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState<string>();
  const [message, setMessage] = useState<string>();

  const load = useCallback(async (current: LighthouseClient) => {
    const [plugins, predicates, issues, storage, prune] = await Promise.all([
      attempt(current.listPlugins()),
      attempt(current.listPredicates()),
      attempt(current.listIssues()),
      attempt(current.getStorage()),
      attempt(current.pruneSnapshots({ dryRun: true })),
    ]);
    setLoaded({
      ...('value' in plugins ? { plugins: plugins.value } : {}),
      ...('value' in predicates ? { predicates: predicates.value } : {}),
      ...('value' in issues ? { issues: issues.value } : {}),
      ...('value' in storage ? { storage: storage.value } : {}),
      ...('value' in prune ? { prune: readPrune(prune.value) } : {}),
    });
    const failure = [plugins, predicates, issues, storage].find((result) => 'error' in result);
    setError(failure && 'error' in failure ? failure.error : undefined);
  }, []);

  useEffect(() => {
    if (client) {
      void load(client);
    }
  }, [client, load]);

  const replaceIssue = useCallback((issue: Issue | undefined) => {
    if (issue) {
      setLoaded((loaded) => ({
        ...loaded,
        issues: loaded.issues?.map((candidate) => (candidate.id === issue.id ? issue : candidate)),
      }));
    }
  }, []);

  const handleComment = useCallback(
    async (id: string, text: string) => {
      if (!client) {
        return;
      }
      setBusy(`issue:${id}`);
      const result = await attempt(client.commentIssue(id, text));
      setBusy(undefined);
      if ('value' in result) {
        replaceIssue(result.value);
      } else {
        setError(result.error);
      }
    },
    [client, replaceIssue],
  );

  const handleSetStatus = useCallback(
    async (id: string, status: IssueStatus, note?: string) => {
      if (!client) {
        return;
      }
      setBusy(`issue:${id}`);
      const result = await attempt(client.setIssueStatus(id, status, note));
      setBusy(undefined);
      if ('value' in result) {
        replaceIssue(result.value);
      } else {
        setError(result.error);
      }
    },
    [client, replaceIssue],
  );

  const handleClearCache = useCallback(
    async (namespace?: string) => {
      if (!client) {
        return;
      }
      setBusy(`cache:${namespace ?? '*'}`);
      const result = await attempt(client.clearCache(namespace));
      setBusy(undefined);
      if ('value' in result) {
        const deleted = result.value.deleted;
        setMessage(t('storage-cleared.message', { count: typeof deleted === 'number' ? deleted : 0 }));
        await load(client);
      } else {
        setError(result.error);
      }
    },
    [client, load, t],
  );

  const handlePrune = useCallback(async () => {
    if (!client) {
      return;
    }
    setBusy('prune');
    const result = await attempt(client.pruneSnapshots({}));
    setBusy(undefined);
    if ('value' in result) {
      const pruned = readPrune(result.value);
      setMessage(
        t('storage-pruned.message', { count: pruned?.snapshots ?? 0, bytes: formatBytes(pruned?.bytes ?? 0) }),
      );
      await load(client);
    } else {
      setError(result.error);
    }
  }, [client, load, t]);

  if (!connection) {
    return <Status.Empty>{t('meta-connection-missing.message')}</Status.Empty>;
  }

  return (
    <LighthouseMeta
      role={role}
      {...loaded}
      error={error}
      busy={busy}
      message={message}
      defaultTab={defaultTab}
      onReload={client ? () => void load(client) : undefined}
      onComment={(id, text) => void handleComment(id, text)}
      onSetStatus={(id, status, note) => void handleSetStatus(id, status, note)}
      onClearCache={(namespace) => void handleClearCache(namespace)}
      onPrune={() => void handlePrune()}
    />
  );
};

LighthouseMetaArticle.displayName = 'LighthouseMetaArticle';
