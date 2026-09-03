//
// Copyright 2026 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, {
  type PropsWithChildren,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { log } from '@dxos/log';
import { IconButton, useTranslation } from '@dxos/react-ui';
import { Form, type FormFieldRenderer, type FormFieldRendererProps, type FormUpdateMeta } from '@dxos/react-ui-form';

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
  /** The handler currently in flight, or undefined when idle. */
  pendingHandler: FeedbackSubmitHandler | undefined;
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

  // Submission is async (screenshot capture, PostHog/Discord round-trip); surface it so the form
  // cannot be double-submitted while it runs.
  const [pendingHandler, setPendingHandler] = useState<FeedbackSubmitHandler | undefined>(undefined);

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
      const handler = submitHandlerRef.current;
      if (!handler) {
        return;
      }

      setPendingHandler(() => handler);
      try {
        await handler(submitted, formMeta);
      } finally {
        setPendingHandler(undefined);
      }
    },
    [hidden?.version],
  );

  return (
    <FeedbackFormProvider submitHandlerRef={submitHandlerRef} pendingHandler={pendingHandler}>
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
// Submit button
//

type SubmitButtonProps = {
  handler: FeedbackSubmitHandler;
  icon: string;
  label: string;
  disabled?: boolean;
};

/**
 * A submit affordance that reflects the form's in-flight state: the active button shows a spinner
 * and the pending label, while every button is disabled until the submission settles.
 */
const FeedbackFormSubmitButton = ({ handler, icon, label, disabled }: SubmitButtonProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { pendingHandler } = useFeedbackFormContext(`${FEEDBACK_FORM}.SubmitButton`);
  const pending = pendingHandler === handler;

  return (
    <FeedbackFormSubmitCapture handler={handler}>
      <Form.Submit
        classNames={pending ? '[&_svg]:animate-spin' : undefined}
        icon={pending ? 'ph--spinner-gap--regular' : icon}
        label={pending ? t('sending-feedback.label') : label}
        disabled={disabled || !!pendingHandler || undefined}
      />
    </FeedbackFormSubmitCapture>
  );
};

FeedbackFormSubmitButton.displayName = `${FEEDBACK_FORM}.SubmitButton`;

//
// Submit
//

export type FeedbackFormSubmitProps = {
  onSubmit: FeedbackSubmitHandler;
  disabled?: boolean;
};

const FeedbackFormSubmit = ({ onSubmit, disabled }: FeedbackFormSubmitProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { submitHandlerRef } = useFeedbackFormContext(`${FEEDBACK_FORM}.Submit`);

  // Keyboard (Enter) submits default to the single handler — but never while disabled
  // (e.g. support tickets unavailable).
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
    <FeedbackFormSubmitButton
      handler={onSubmit}
      icon='ph--paper-plane-tilt--regular'
      label={t('send-feedback.label')}
      disabled={disabled}
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
