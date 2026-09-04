//
// Copyright 2026 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, useCallback, useMemo, useState } from 'react';

import { log } from '@dxos/log';
import { IconButton, useTranslation } from '@dxos/react-ui';
import { Form, type FormFieldRenderer, type FormFieldRendererProps, type FormUpdateMeta } from '@dxos/react-ui-form';

import { type DiscordPresence } from '#hooks';
import { meta } from '#meta';
import { SupportOperation } from '#types';

import { AreaSelectField } from './AreaSelectField';
import type { FeedbackPluginOption } from './types';

const FEEDBACK_FORM = 'FeedbackForm';

/** The form's submit handler, given to `FeedbackForm.Root`; button clicks and Enter both reach it. */
export type FeedbackSubmitHandler = (
  values: SupportOperation.SupportRequest,
  meta: FormUpdateMeta<SupportOperation.SupportRequest>,
) => void | Promise<void>;

type FeedbackFormContextValue = {
  /** True while a submission is in flight. */
  pending: boolean;
};

const [FeedbackFormProvider, useFeedbackFormContext] = createContext<FeedbackFormContextValue>(FEEDBACK_FORM);

export type FeedbackFormRootProps = PropsWithChildren<{
  onSubmit: FeedbackSubmitHandler;
  hidden?: { version?: string };
  plugins?: ReadonlyArray<FeedbackPluginOption>;
}>;

const baseDefaults: SupportOperation.SupportRequest = {
  title: '',
  body: '',
  image: false,
  includeLogs: true,
};

//
// Root
//

/**
 * Headless provider + `Form.Root` for support feedback. Compose `Form.Viewport` / `Form.Content` /
 * `Form.FieldSet` with the `FeedbackForm.*` parts; the submit handler lives on the root so the
 * button and the Enter key share it.
 */
const FeedbackFormRoot = ({ children, onSubmit, hidden, plugins }: FeedbackFormRootProps) => {
  // Submission is async (screenshot capture, PostHog/Discord round-trip); surface it so the form
  // cannot be double-submitted while it runs.
  const [pending, setPending] = useState(false);

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
    const AreaField: FormFieldRenderer = (props: FormFieldRendererProps) => (
      <AreaSelectField {...(props as FormFieldRendererProps<string | undefined>)} plugins={plugins} />
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
      setPending(true);
      try {
        await onSubmit(submitted, formMeta);
      } finally {
        setPending(false);
      }
    },
    [onSubmit, hidden?.version],
  );

  return (
    <FeedbackFormProvider pending={pending}>
      <Form.Root
        schema={SupportOperation.SupportRequest}
        defaultValues={defaultValues}
        fieldMap={fieldMap}
        onSave={handleSave}
      >
        {children}
      </Form.Root>
    </FeedbackFormProvider>
  );
};

FeedbackFormRoot.displayName = `${FEEDBACK_FORM}.Root`;

//
// DownloadLogs
//

export type FeedbackFormDownloadLogsProps = {
  onDownloadLogs?: () => void | Promise<void>;
};

const FeedbackFormDownloadLogs = ({ onDownloadLogs }: FeedbackFormDownloadLogsProps) => {
  const { t } = useTranslation(meta.profile.key);
  const handleClick = useCallback(async () => {
    try {
      await onDownloadLogs?.();
    } catch (err) {
      log.catch(err);
    }
  }, [onDownloadLogs]);

  if (!onDownloadLogs) {
    return null;
  }

  return (
    <div className='flex w-full pt-form-padding'>
      <IconButton
        classNames='w-full'
        type='button'
        icon='ph--download-simple--regular'
        label={t('download-logs.label')}
        onClick={handleClick}
        data-testid='download-logs-button'
      />
    </div>
  );
};

FeedbackFormDownloadLogs.displayName = `${FEEDBACK_FORM}.DownloadLogs`;

//
// Submit
//

export type FeedbackFormSubmitProps = {
  /** Where the report goes: a public Discord thread as well as the ticket, or the ticket alone. */
  variant?: 'discord' | 'ticket';
  disabled?: boolean;
};

/**
 * The submit button, reflecting the form's in-flight state: a spinner and the pending label while
 * the submission runs, disabled until it settles.
 */
const FeedbackFormSubmit = ({ variant = 'ticket', disabled }: FeedbackFormSubmitProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { pending } = useFeedbackFormContext(`${FEEDBACK_FORM}.Submit`);
  const label = variant === 'discord' ? t('send-feedback.label') : t('send-report.label');

  return (
    <Form.Submit
      classNames={pending ? '[&_svg]:animate-spin' : undefined}
      icon={pending ? 'ph--spinner-gap--regular' : 'ph--paper-plane-tilt--regular'}
      label={pending ? t('sending-feedback.label') : label}
      disabled={disabled || pending || undefined}
    />
  );
};

FeedbackFormSubmit.displayName = `${FEEDBACK_FORM}.Submit`;

//
// DiscordPresence
//

export type FeedbackFormDiscordPresenceProps = {
  discordPresence?: DiscordPresence;
};

const FeedbackFormDiscordPresence = ({ discordPresence }: FeedbackFormDiscordPresenceProps) => {
  const { t } = useTranslation(meta.profile.key);

  if (!discordPresence) {
    return null;
  }

  if (discordPresence.teamOnline <= 0 && discordPresence.communityOnline <= 0) {
    return null;
  }

  return (
    <p className='text-xs text-description text-center px-2 py-1'>
      {t('discord-presence-online.label')}{' '}
      {[
        discordPresence.communityOnline > 0 &&
          t('discord-presence-members.label', { count: discordPresence.communityOnline }),
        discordPresence.teamOnline > 0 && t('discord-presence-team.label', { count: discordPresence.teamOnline }),
      ]
        .filter(Boolean)
        .join(' · ')}
    </p>
  );
};

FeedbackFormDiscordPresence.displayName = `${FEEDBACK_FORM}.DiscordPresence`;

//
// FeedbackForm
//

export const FeedbackForm = {
  Root: FeedbackFormRoot,
  DownloadLogs: FeedbackFormDownloadLogs,
  Submit: FeedbackFormSubmit,
  DiscordPresence: FeedbackFormDiscordPresence,
};
