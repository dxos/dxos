//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Option from 'effect/Option';
import React, { useCallback, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { Annotation } from '@dxos/echo';
import { log } from '@dxos/log';
import { type Space } from '@dxos/react-client/echo';
import { Form } from '@dxos/react-ui-form';
import * as Button from '@dxos/react-ui/Button';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Input from '@dxos/react-ui/Input';
import * as Menu from '@dxos/react-ui/Menu';
import * as Typography from '@dxos/react-ui/Typography';

import { Publication, SpaceOperation } from '#types';

import { SpaceNamespace } from '../../namespace.ts';
import { SpaceOperationConfig } from '../../operations/helpers.ts';

export type PublishingSettingsProps = { space: Space };

export const PublishingSettings = ({ space }: PublishingSettingsProps) => {
  const { t } = UiHooks.useTranslation(SpaceNamespace.key);
  const { invokePromise } = Hooks.useOperationInvoker();
  const { publication } = Hooks.useCapability(SpaceOperationConfig);
  const receipt =
    Option.getOrUndefined(useAtomValue(Annotation.atom(space.properties, Publication.ReceiptAnnotation))) ?? undefined;
  const url = receipt && publication && Publication.viewerUrl(publication.viewerOrigin, receipt.publicId).toString();
  const [pending, setPending] = useState(false);

  const run = useCallback(
    async (key: string, failed: string, invoke: () => Promise<{ error?: Error }>) => {
      setPending(true);
      const { error } = await invoke();
      setPending(false);
      if (error) {
        log.catch(error, { stage: key, spaceId: space.id });
        void invokePromise(LayoutOperation.AddToast, {
          id: `${space.id}-${key}-failed`,
          title: t(failed),
          icon: 'ph--warning--regular',
        });
      }
    },
    [space, invokePromise, t],
  );
  const handlePublish = useCallback(
    () => run('publish', 'publish-failed-toast.title', () => invokePromise(SpaceOperation.PublishSpace, { space })),
    [run, invokePromise, space],
  );
  const handleUnpublish = useCallback(
    () =>
      run('unpublish', 'unpublish-failed-toast.title', () => invokePromise(SpaceOperation.UnpublishSpace, { space })),
    [run, invokePromise, space],
  );

  if (!publication) {
    return null;
  }

  return (
    <Form.FieldSet label={t('publishing.title')} description={t('publishing.description')}>
      <Form.Field
        standalone
        label={t('publication-status.title')}
        description={
          receipt ? t('publication-status.published.description') : t('publication-status.unpublished.description')
        }
      >
        {receipt ? (
          <div className='flex items-center gap-3'>
            <span className='text-description whitespace-nowrap' data-testid='spaceSettings.publishedAt'>
              {t('publication-status.published.label')}{' '}
              <Typography.Timestamp date={receipt.publishedAt} variant='relative' justNow={t('just-now.label')} />
            </span>
            <Menu.Root>
              <Menu.Trigger asChild>
                <Button.Root caretDown disabled={pending} data-testid='spaceSettings.managePublication'>
                  {t('manage-publication.label')}
                </Button.Root>
              </Menu.Trigger>
              <Menu.Content>
                <Menu.Item
                  onClick={handlePublish}
                  item={{ value: 'republish', label: t('republish-space.label') }}
                  data-testid='spaceSettings.republish'
                />
                <Menu.Item
                  onClick={handleUnpublish}
                  item={{ value: 'unpublish', label: t('unpublish-space.label') }}
                  data-testid='spaceSettings.unpublish'
                />
              </Menu.Content>
            </Menu.Root>
          </div>
        ) : (
          <Button.Root disabled={pending} onClick={handlePublish} data-testid='spaceSettings.publish'>
            {t('publish-space.label')}
          </Button.Root>
        )}
      </Form.Field>
      {url && (
        <Form.Field standalone label={t('public-link.title')} description={t('public-link.description')}>
          <Input.Root
            value={url}
            disabled
            variant='mono'
            copyable
            aria-label={t('public-link.title')}
            classNames='w-80 max-w-full min-w-0'
          />
        </Form.Field>
      )}
    </Form.FieldSet>
  );
};
