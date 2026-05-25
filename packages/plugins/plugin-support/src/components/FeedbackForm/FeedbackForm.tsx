//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useRef } from 'react';

import { IconButton, useTranslation } from '@dxos/react-ui';
import {
  type FormFieldComponent,
  type FormFieldComponentProps,
  type FormRootProps,
  type FormUpdateMeta,
  Form,
} from '@dxos/react-ui-form';

import { type DiscordPresence } from '#hooks';
import { meta } from '#meta';
import { SupportOperation } from '#types';

import { AreaSelectField } from './AreaSelectField';
import type { FeedbackPluginOption } from './types';

type SubmitAction = 'posthog' | 'discord' | 'github';

/**
 * Per-action enablement gate. Each submit button (`Send Feedback`, `Create GitHub Issue`,
 * `Ask for Help on Discord`) has independent prerequisites — PostHog/Discord both require
 * the Observability `feedback` survey to be reachable, GitHub doesn't (it just opens a
 * prefilled `issues/new` URL). Callers pass `true` to disable a specific action.
 */
export type FeedbackFormDisabled = Partial<Record<SubmitAction, boolean>>;

export type FeedbackFormProps = Pick<FormRootProps<SupportOperation.SupportRequest>, 'onSave'> & {
  /** Per-action disabled map; omit to leave every action enabled. */
  disabled?: FeedbackFormDisabled;
  hidden?: { version?: string };
  plugins?: ReadonlyArray<FeedbackPluginOption>;
  discordPresence?: DiscordPresence;
  onDiscord?: (values: SupportOperation.SupportRequest) => void | Promise<void>;
  onGitHub?: (values: SupportOperation.SupportRequest) => void | Promise<void>;
  onDownloadLogs?: () => void | Promise<void>;
};

const baseDefaults: SupportOperation.SupportRequest = {
  type: 'bug',
  severity: 'Medium priority',
  title: '',
  body: '',
  image: false,
  includeLogs: true,
};

export const FeedbackForm = ({
  hidden,
  plugins,
  discordPresence,
  disabled,
  onSave,
  onDiscord,
  onGitHub,
  onDownloadLogs,
}: FeedbackFormProps) => {
  const { t } = useTranslation(meta.id);
  const actionRef = useRef<SubmitAction>('posthog');

  // Override the `area` field with a richer plugin picker. The closure captures
  // the runtime plugin list so the schema itself stays static — much cleaner
  // than the previous `Format.OptionsAnnotation.set(...)` runtime-schema-extension
  // hack, which only supported plain string options without rich labels.
  //
  // See `packages/ui/react-ui-form/src/components/Form/FormField.tsx` (the
  // `fieldMap?.[jsonPath]` branch) for the override mechanism: it's keyed by
  // the field's JSON path (here just `area` since the form has a flat shape).
  const fieldMap = useMemo(() => {
    if (!plugins || plugins.length === 0) {
      return undefined;
    }
    const AreaField: FormFieldComponent = (props: FormFieldComponentProps) => (
      <AreaSelectField {...(props as FormFieldComponentProps<string | undefined>)} plugins={plugins} />
    );
    return { area: AreaField };
  }, [plugins]);

  const defaultValues = useMemo<SupportOperation.SupportRequest>(
    () => ({ ...baseDefaults, version: hidden?.version }),
    [hidden?.version],
  );

  const handleSave = useCallback(
    async (values: SupportOperation.SupportRequest, formMeta: FormUpdateMeta<SupportOperation.SupportRequest>) => {
      // Re-attach hidden fields in case the form ever drops them.
      const submitted: SupportOperation.SupportRequest = {
        ...values,
        version: values.version ?? hidden?.version,
      };
      switch (actionRef.current) {
        case 'discord':
          await onDiscord?.(submitted);
          return;
        case 'github':
          await onGitHub?.(submitted);
          return;
        case 'posthog':
        default:
          await onSave?.(submitted, formMeta);
          return;
      }
    },
    [onSave, onDiscord, onGitHub, hidden?.version],
  );

  return (
    <Form.Root
      schema={SupportOperation.SupportRequest}
      defaultValues={defaultValues}
      fieldMap={fieldMap}
      onSave={handleSave}
    >
      <Form.Viewport>
        <Form.Content>
          <Form.FieldSet />
          {onDownloadLogs && (
            <div className='flex w-full pt-form-padding'>
              <IconButton
                classNames='w-full'
                type='button'
                icon='ph--download-simple--regular'
                label={t('download-logs.label')}
                onClick={() => void onDownloadLogs()}
                data-testid='download-logs-button'
              />
            </div>
          )}
          {/*
            `onClickCapture` (not `onClick`) — `Form.Submit` is an IconButton with
            its own `onClick={onSave}` that triggers form submission in the bubble
            phase. The bubble phase runs child handlers before parent handlers, so
            an `onClick` on this wrapper would set `actionRef` AFTER `handleSave`
            had already fired with the stale value. Capture-phase runs parent
            handlers first and is the documented escape hatch for this pattern.
          */}
          <div onClickCapture={() => (actionRef.current = 'posthog')}>
            <Form.Submit
              icon='ph--paper-plane-tilt--regular'
              label={t('send-feedback.label')}
              disabled={disabled?.posthog || undefined}
            />
          </div>
          {onGitHub && (
            <div onClickCapture={() => (actionRef.current = 'github')}>
              <Form.Submit
                icon='ph--github-logo--regular'
                label={t('create-github-issue.label')}
                disabled={disabled?.github || undefined}
              />
            </div>
          )}
          {onDiscord && (
            <>
              <div onClickCapture={() => (actionRef.current = 'discord')}>
                <Form.Submit
                  icon='ph--discord-logo--regular'
                  label={t('ask-for-help.label')}
                  disabled={disabled?.discord || undefined}
                />
              </div>
              {discordPresence && (discordPresence.teamOnline > 0 || discordPresence.communityOnline > 0) && (
                <p className='text-xs text-description text-center px-2 py-1'>
                  {t('discord-presence-online.label')}{' '}
                  {[
                    discordPresence.communityOnline > 0 &&
                      t('discord-presence-members.label', { count: discordPresence.communityOnline }),
                    discordPresence.teamOnline > 0 &&
                      t('discord-presence-team.label', { count: discordPresence.teamOnline }),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              )}
            </>
          )}
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};
