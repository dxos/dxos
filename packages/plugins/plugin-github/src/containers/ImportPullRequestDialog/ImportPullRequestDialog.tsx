//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { useActiveSpace } from '@dxos/app-toolkit/ui';
import { log } from '@dxos/log';
import { Column, Dialog, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { GitHubOperation } from '#types';

import { GitHubRepoInaccessibleError } from '../../errors.ts';
import { parsePullRequestReference } from '../../extensions/index.ts';
import { useOpenObject } from '../../hooks/index.ts';
import { GitHubApi } from '../../services/index.ts';

const ImportPullRequestForm = Schema.Struct({
  reference: Schema.String.pipe(
    // Validated here as well as in the operation: a typo should be answered by the field the user is
    // looking at, not by a toast after a round trip to GitHub.
    Schema.check(
      Schema.makeFilter(
        (value: string) =>
          parsePullRequestReference(value) !== undefined || 'Paste a pull request link or owner/repo#number.',
      ),
    ),
    Schema.annotate({ title: 'Pull request', description: 'https://github.com/owner/repo/pull/123 or owner/repo#123' }),
  ),
});

type ImportPullRequestForm = Schema.Schema.Type<typeof ImportPullRequestForm>;

/**
 * The status `GitHubRepoInaccessibleError` recorded, for the case the HTTP failure has already been
 * folded into it and `GitHubApi.responseStatus` no longer sees a response.
 */
const readStatus = (error: unknown): number | undefined => {
  if (!GitHubRepoInaccessibleError.is(error)) {
    return undefined;
  }
  const status = error.context.status;
  return typeof status === 'number' ? status : undefined;
};

/**
 * Names the failure the user can act on. A rejected credential and a repository the connection
 * cannot see both read as "not found" from the API, but only the first is fixed by reconnecting —
 * and a space with no connection at all is fixed by making one.
 */
const importFailureKey = (error: unknown): string => {
  if (!GitHubRepoInaccessibleError.is(error)) {
    return 'import-pull-request-failed.title';
  }
  if (error.context.tokenStatus === 401) {
    return 'import-pull-request-token-rejected.title';
  }
  return error.context.connected === true
    ? 'import-pull-request-inaccessible.title'
    : 'import-pull-request-not-connected.title';
};

/**
 * Imports a pull request the user names, into the space they are working in, and opens it.
 *
 * The space is the active one rather than a chosen one: the command is reached from wherever the
 * user already is, and a picker would ask a question they have already answered.
 */
export const ImportPullRequestDialog = () => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  const openObject = useOpenObject();
  const space = useActiveSpace();

  const handleCancel = useCallback(async () => {
    await invokePromise(LayoutOperation.UpdateDialog, { state: false });
  }, [invokePromise]);

  const handleSave = useCallback(
    async ({ reference }: ImportPullRequestForm) => {
      if (!space) {
        // The command is reachable from the root, which has no space of its own; saying so beats a
        // button that appears to do nothing.
        await invokePromise(LayoutOperation.AddToast, {
          id: `${meta.profile.key}.import-pull-request`,
          icon: 'ph--warning--regular',
          title: ['import-pull-request-no-space.title', { ns: meta.profile.key }],
        });
        return;
      }

      const { data, error } = await invokePromise(
        GitHubOperation.ImportPullRequest,
        { reference: reference.trim() },
        { spaceId: space.db.spaceId },
      );

      const pullRequest = data?.pullRequest.target;
      if (error || !pullRequest) {
        const status = GitHubApi.responseStatus(error) ?? readStatus(error);
        // A minified build serialises the invoker's error as a bare, headerless stack, so the name and
        // the HTTP status it carries are logged explicitly — without them a feedback bundle names the
        // failure without saying what it was.
        log.warn('pull request import failed', { reference, errorName: error?.name, status, err: error });
        await invokePromise(LayoutOperation.AddToast, {
          id: `${meta.profile.key}.import-pull-request`,
          icon: 'ph--warning--regular',
          title: [importFailureKey(error), { ns: meta.profile.key }],
          // The status is what separates a reference the user should re-check from a connection they
          // should repair, and it is otherwise visible only in the logs.
          description: status ? `${reference} — HTTP ${status}` : reference,
        });
        return;
      }

      // Closed only on success: a failed import keeps the reference the user typed, which is the
      // thing they would otherwise have to find again.
      await invokePromise(LayoutOperation.UpdateDialog, { state: false });
      await openObject(pullRequest);
    },
    [invokePromise, openObject, space],
  );

  return (
    <Dialog.Content>
      <Dialog.Header>
        <Dialog.Title>{t('import-pull-request-dialog.title')}</Dialog.Title>
        <Dialog.Close asChild>
          <Dialog.ActionIconButton action='close' />
        </Dialog.Close>
      </Dialog.Header>
      <Dialog.Body>
        <Form.Root
          autoFocus
          schema={ImportPullRequestForm}
          defaultValues={{ reference: '' }}
          onSave={handleSave}
          onCancel={handleCancel}
        >
          <Column.Center>
            <Form.Content>
              <Form.Fields />
              <Form.Actions submitLabel={t('import-pull-request-submit.label')} />
            </Form.Content>
          </Column.Center>
        </Form.Root>
      </Dialog.Body>
    </Dialog.Content>
  );
};

ImportPullRequestDialog.displayName = 'ImportPullRequestDialog';
