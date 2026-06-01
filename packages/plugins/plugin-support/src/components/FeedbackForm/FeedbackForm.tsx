//
// Copyright 2026 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, type RefObject, useCallback, useEffect, useMemo, useRef } from 'react';

import { IconButton, useTranslation } from '@dxos/react-ui';
import { type FormFieldComponent, type FormFieldComponentProps, type FormUpdateMeta, Form } from '@dxos/react-ui-form';

import { type DiscordPresence } from '#hooks';
import { meta } from '#meta';
import { SupportOperation } from '#types';

import { AreaSelectField } from './AreaSelectField';
import type { FeedbackPluginOption } from './types';

const FEEDBACK_FORM = 'FeedbackForm';

/**
 * A form submit handler. `Form.Root` exposes a single `onSave`; the active submit button records
 * its handler here (in click-capture, before submit fires) so the form routes to it.
 */
export type FeedbackSubmitHandler = (
  values: SupportOperation.SupportRequest,
  meta: FormUpdateMeta<SupportOperation.SupportRequest>,
) => void | Promise<void>;

type FeedbackFormContextValue = {
  submitHandlerRef: RefObject<FeedbackSubmitHandler | undefined>;
};

const [FeedbackFormProvider, useFeedbackFormContext] = createContext<FeedbackFormContextValue>(FEEDBACK_FORM);

export type FeedbackFormRootProps = PropsWithChildren<{
  hidden?: { version?: string };
  plugins?: ReadonlyArray<FeedbackPluginOption>;
}>;

const baseDefaults: SupportOperation.SupportRequest = {
  type: 'bug',
  severity: 'Medium priority',
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
 * `Form.FieldSet` with `FeedbackForm.*` action parts; each action part takes its own callback so the
 * behaviour lives with the affordance.
 */
const FeedbackFormRoot = ({ children, hidden, plugins }: FeedbackFormRootProps) => {
  // The active submit button writes its handler here before `Form.Root` fires `onSave`.
  const submitHandlerRef = useRef<FeedbackSubmitHandler | undefined>(undefined);

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
      await submitHandlerRef.current?.(submitted, formMeta);
    },
    [hidden?.version],
  );

  return (
    <FeedbackFormProvider submitHandlerRef={submitHandlerRef}>
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
  const { t } = useTranslation(meta.id);

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
        onClick={() => void onDownloadLogs()}
        data-testid='download-logs-button'
      />
    </div>
  );
};

FeedbackFormDownloadLogs.displayName = `${FEEDBACK_FORM}.DownloadLogs`;

//
// Submit capture
//

type SubmitCaptureProps = PropsWithChildren<{
  handler: FeedbackSubmitHandler;
}>;

/**
 * Records the active submit handler in capture phase before `Form.Submit` fires.
 */
const FeedbackFormSubmitCapture = ({ handler, children }: SubmitCaptureProps) => {
  const { submitHandlerRef } = useFeedbackFormContext(`${FEEDBACK_FORM}.SubmitCapture`);

  return <div onClickCapture={() => (submitHandlerRef.current = handler)}>{children}</div>;
};

FeedbackFormSubmitCapture.displayName = `${FEEDBACK_FORM}.SubmitCapture`;

//
// SubmitPosthog
//

export type FeedbackFormSubmitPosthogProps = {
  onSubmit: FeedbackSubmitHandler;
  disabled?: boolean;
};

const FeedbackFormSubmitPosthog = ({ onSubmit, disabled }: FeedbackFormSubmitPosthogProps) => {
  const { t } = useTranslation(meta.id);
  const { submitHandlerRef } = useFeedbackFormContext(`${FEEDBACK_FORM}.SubmitPosthog`);

  // Primary action: default a keyboard (Enter) submit to PostHog until another button is clicked —
  // but never while disabled (e.g. feedback survey unavailable).
  useEffect(() => {
    if (disabled) {
      if (submitHandlerRef.current === onSubmit) {
        submitHandlerRef.current = undefined;
      }
      return;
    }
    submitHandlerRef.current ??= onSubmit;
  }, [disabled, onSubmit, submitHandlerRef]);

  return (
    <FeedbackFormSubmitCapture handler={onSubmit}>
      <Form.Submit
        icon='ph--paper-plane-tilt--regular'
        label={t('send-feedback.label')}
        disabled={disabled || undefined}
      />
    </FeedbackFormSubmitCapture>
  );
};

FeedbackFormSubmitPosthog.displayName = `${FEEDBACK_FORM}.SubmitPosthog`;

//
// SubmitGitHub
//

export type FeedbackFormSubmitGitHubProps = {
  onSubmit?: FeedbackSubmitHandler;
  disabled?: boolean;
};

const FeedbackFormSubmitGitHub = ({ onSubmit, disabled }: FeedbackFormSubmitGitHubProps) => {
  const { t } = useTranslation(meta.id);

  if (!onSubmit) {
    return null;
  }

  return (
    <FeedbackFormSubmitCapture handler={onSubmit}>
      <Form.Submit
        icon='ph--github-logo--regular'
        label={t('create-github-issue.label')}
        disabled={disabled || undefined}
      />
    </FeedbackFormSubmitCapture>
  );
};

FeedbackFormSubmitGitHub.displayName = `${FEEDBACK_FORM}.SubmitGitHub`;

//
// SubmitDiscord
//

export type FeedbackFormSubmitDiscordProps = {
  onSubmit?: FeedbackSubmitHandler;
  disabled?: boolean;
};

const FeedbackFormSubmitDiscord = ({ onSubmit, disabled }: FeedbackFormSubmitDiscordProps) => {
  const { t } = useTranslation(meta.id);

  if (!onSubmit) {
    return null;
  }

  return (
    <FeedbackFormSubmitCapture handler={onSubmit}>
      <Form.Submit icon='ph--discord-logo--regular' label={t('ask-for-help.label')} disabled={disabled || undefined} />
    </FeedbackFormSubmitCapture>
  );
};

FeedbackFormSubmitDiscord.displayName = `${FEEDBACK_FORM}.SubmitDiscord`;

//
// DiscordPresence
//

export type FeedbackFormDiscordPresenceProps = {
  discordPresence?: DiscordPresence;
};

const FeedbackFormDiscordPresence = ({ discordPresence }: FeedbackFormDiscordPresenceProps) => {
  const { t } = useTranslation(meta.id);

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
  SubmitPosthog: FeedbackFormSubmitPosthog,
  SubmitGitHub: FeedbackFormSubmitGitHub,
  SubmitDiscord: FeedbackFormSubmitDiscord,
  DiscordPresence: FeedbackFormDiscordPresence,
};
