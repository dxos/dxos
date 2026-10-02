//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import React, { type PropsWithChildren, useCallback, useMemo, useState } from 'react';

import { log } from '@dxos/log';
import { createContext } from '@dxos/react-hooks';
import { Flex, IconButton, Select, useTranslation } from '@dxos/react-ui';
import {
  Form,
  type FormFieldRenderer,
  type FormFieldRendererProps,
  type FormUpdateMeta,
  useFormContext,
} from '@dxos/react-ui-form';

import { type DiscordPresence } from '#hooks';
import { meta } from '#meta';
import { SupportOperation } from '#types';

import { AreaSelectField } from './AreaSelectField.tsx';
import type { FeedbackPluginOption, FeedbackProjectOption } from './types.ts';

const FEEDBACK_FORM = 'FeedbackForm';

/** Resolves to whether the report was filed; the form clears only when it was. */
export type FeedbackSubmitHandler = (
  values: SupportOperation.SupportRequest,
  meta: FormUpdateMeta<SupportOperation.SupportRequest>,
) => boolean | Promise<boolean>;

/** Resolves to whether the report was filed in the chosen project; the form clears only when it was. */
export type FeedbackReportToProjectHandler = (
  projectId: string,
  values: SupportOperation.SupportRequest,
) => boolean | Promise<boolean>;

type FeedbackFormContextValue = {
  pending: boolean;
  /** Runs a submission route with the hidden fields attached, guarding against double submits and clearing on success. */
  submit: (
    route: (values: SupportOperation.SupportRequest) => boolean | Promise<boolean>,
    values: SupportOperation.SupportRequest,
  ) => Promise<void>;
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

const FeedbackFormRoot = ({ children, onSubmit, hidden, plugins }: FeedbackFormRootProps) => {
  // Submission is async (screenshot capture, PostHog/Discord round-trip); surface it so the form
  // cannot be double-submitted while it runs.
  const [pending, setPending] = useState(false);

  const [formKey, setFormKey] = useState(0);

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

  const submit = useCallback<FeedbackFormContextValue['submit']>(
    async (route, values) => {
      // Re-attach hidden fields in case the form ever drops them.
      const submitted: SupportOperation.SupportRequest = {
        ...values,
        version: values.version ?? hidden?.version,
      };
      setPending(true);
      try {
        if (await route(submitted)) {
          setFormKey((key) => key + 1);
        }
      } finally {
        setPending(false);
      }
    },
    [hidden?.version],
  );

  const handleSave = useCallback(
    (values: SupportOperation.SupportRequest, formMeta: FormUpdateMeta<SupportOperation.SupportRequest>) =>
      submit((submitted) => onSubmit(submitted, formMeta), values),
    [submit, onSubmit],
  );

  return (
    <FeedbackFormProvider pending={pending} submit={submit}>
      <Form.Root
        key={formKey}
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
    <Flex classNames='w-full pt-form-padding'>
      <IconButton
        classNames='w-full'
        type='button'
        icon='ph--download-simple--regular'
        label={t('download-logs.label')}
        onClick={handleClick}
        data-testid='download-logs-button'
      />
    </Flex>
  );
};

FeedbackFormDownloadLogs.displayName = `${FEEDBACK_FORM}.DownloadLogs`;

const noteClassNames = 'text-xs text-description text-center px-2 py-1';

export type FeedbackFormSubmitProps = {
  disabled?: boolean;
};

const FeedbackFormSubmit = ({ disabled }: FeedbackFormSubmitProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { pending } = useFeedbackFormContext(`${FEEDBACK_FORM}.Submit`);

  return (
    <>
      <p className={noteClassNames}>{t('public-report.description')}</p>
      <Form.Submit
        classNames={pending ? '[&_svg]:animate-spin' : undefined}
        icon={pending ? 'ph--spinner-gap--regular' : 'ph--paper-plane-tilt--regular'}
        label={pending ? t('sending-feedback.label') : t('send-feedback.label')}
        disabled={disabled || pending || undefined}
      />
    </>
  );
};

FeedbackFormSubmit.displayName = `${FEEDBACK_FORM}.Submit`;

//
// ReportToProject
//

export type FeedbackFormReportToProjectProps = {
  /** Local projects the report can be filed in; nothing renders when empty. */
  projects?: ReadonlyArray<FeedbackProjectOption>;
  onReport?: FeedbackReportToProjectHandler;
};

/**
 * Files the report as a task in a chosen local project instead of sending it to support. Validates
 * the same form as {@link FeedbackFormSubmit} but bypasses its `onSave`, which belongs to the public route.
 */
const FeedbackFormReportToProject = ({ projects, onReport }: FeedbackFormReportToProjectProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { pending, submit } = useFeedbackFormContext(`${FEEDBACK_FORM}.ReportToProject`);
  const { form } = useFormContext(`${FEEDBACK_FORM}.ReportToProject`);
  const [selected, setSelected] = useState<string>();

  // Falls back to the first project so a single-project space needs no extra click, and so a
  // selection whose project was deleted does not strand the button.
  const projectId = projects?.some((project) => project.id === selected) ? selected : projects?.[0]?.id;

  const handleClick = useCallback(async () => {
    // Decoded rather than trusted: the handler holds partial values until every required field is filled.
    const values = Schema.decodeUnknownOption(SupportOperation.SupportRequest)(form.values);
    if (!onReport || !projectId || Option.isNone(values)) {
      return;
    }
    await submit((submitted) => onReport(projectId, submitted), values.value);
  }, [onReport, projectId, form.values, submit]);

  if (!onReport || !projects || projects.length === 0) {
    return null;
  }

  return (
    <Flex column gap='form' classNames='w-full pt-form-padding' data-testid='report-to-project'>
      <Select.Root value={projectId} onValueChange={setSelected}>
        <Select.TriggerButton classNames='w-full' disabled={pending} placeholder={t('report-project.placeholder')} />
        <Select.Portal>
          <Select.Content>
            <Select.Viewport>
              {projects.map((project) => (
                <Select.Option key={project.id} value={project.id}>
                  {project.name}
                </Select.Option>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
      <IconButton
        classNames='w-full'
        type='button'
        icon={pending ? 'ph--spinner-gap--regular' : 'ph--kanban--regular'}
        label={t('report-to-project.label')}
        disabled={pending || !form.isValid || !projectId}
        onClick={handleClick}
        data-testid='report-to-project-button'
      />
      <p className={noteClassNames}>{t('report-to-project.description')}</p>
    </Flex>
  );
};

FeedbackFormReportToProject.displayName = `${FEEDBACK_FORM}.ReportToProject`;

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
    <p className={noteClassNames}>
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
  ReportToProject: FeedbackFormReportToProject,
  DiscordPresence: FeedbackFormDiscordPresence,
};
