//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useCallback, useMemo, useState } from 'react';

import { usePluginManager } from '@dxos/app-framework/ui';
import { useCapabilities, useCapability, useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { runAndForwardErrors } from '@dxos/effect';
import { log } from '@dxos/log';
import { ObservabilityCapabilities } from '@dxos/plugin-observability';
import { useConfig } from '@dxos/react-client';
import { useAsyncEffect } from '@dxos/react-hooks';
import { osTranslations } from '@dxos/ui-theme';

import { type FeedbackPluginOption, FeedbackForm } from '#components';
import { useDiscordPresence } from '#hooks';
import { meta } from '#meta';
import { SupportOperation } from '#types';

import { DISCORD_SERVICE_URL as DEFAULT_DISCORD_SERVICE_URL, GITHUB_NEW_ISSUE_URL } from '../../constants';
import { DEFAULT_IMAGE_SERVICE_URL, captureScreenshot, uploadScreenshot } from './screenshot';

const CUSTOM_LABEL = 'Composer';

/**
 * Map our internal `IssueType` discriminator to the org-level GitHub Issue Type name.
 * GitHub launched Issue Types as a top-level org-configured field distinct from labels
 * (the "Type: No type" / "Type: Bug" widget in the issue sidebar). It's set via the
 * `?type=` query param on `issues/new`. Names are case-sensitive and must match a type
 * configured on the dxos org. If a type isn't found, GitHub silently leaves the field
 * empty (same failure mode as unknown labels).
 *
 * Priority is intentionally NOT here: priority on dxos/dxos is a GitHub Projects custom
 * field, which cannot be set via URL prefill. We emit it as a label (`High priority`,
 * `Medium priority`, `Low priority`) so triagers can see the user-reported severity in
 * the labels strip and convert it to the Projects field manually.
 */
const ISSUE_TYPE_NAME: Record<SupportOperation.IssueType, string> = {
  bug: 'Bug',
  feature: 'Feature',
};

/** Build a direct PostHog event permalink (±15s search window via timestamp). */
const makePostHogEventUrl = (projectId: string, eventUuid: string): string =>
  `https://eu.posthog.com/project/${projectId}/events/${eventUuid}/${encodeURIComponent(new Date().toISOString())}`;

/**
 * Collapse a {@link SupportOperation.SupportRequest} into the legacy `{ message, includeLogs }`
 * shape consumed by the Observability backend and the Discord help-thread service. Triage
 * metadata (type/severity/area/version) is embedded as a Markdown trailer so the
 * single-string `message` carries the full context.
 */
const formatRequestMessage = (values: SupportOperation.SupportRequest): string => {
  const trailer = [
    `**Type:** ${values.type}`,
    `**Severity:** ${values.severity}`,
    values.area && `**Area:** ${values.area}`,
    values.version && `**Version:** ${values.version}`,
  ]
    .filter(Boolean)
    .join('\n');
  const heading = `# ${values.title}`;
  return [heading, values.body, '---', trailer].filter(Boolean).join('\n\n');
};

/**
 * Build a GitHub "new issue" URL with title/body/labels prefilled from the form values.
 * `screenshotUrl`, when supplied, is embedded as a markdown image at the top of the body.
 */
const buildGitHubIssueUrl = (values: SupportOperation.SupportRequest, screenshotUrl?: string): string => {
  // `Composer` is a source-anchor label so every form submission is findable via
  // a single `label:Composer` GitHub search. The severity label (`High priority`,
  // …) gives triagers an at-a-glance view of user-reported urgency. GitHub
  // silently drops `labels=` entries that don't already exist on the repo, so
  // ensure these labels are provisioned in dxos/dxos for them to actually stick.
  const labels = [CUSTOM_LABEL, values.severity];
  if (values.area) {
    labels.push(`area/${values.area}`);
  }

  const trailer = [
    `**Type:** ${values.type}`,
    `**Severity:** ${values.severity}`,
    values.area && `**Area:** ${values.area}`,
    values.version && `**Version:** ${values.version}`,
  ]
    .filter(Boolean)
    .join('\n');

  const body = [screenshotUrl && `![Screenshot](${screenshotUrl})`, values.body, '---', trailer]
    .filter(Boolean)
    .join('\n\n');
  // `type` is GitHub's org-level Issue Type field (sidebar widget separate
  // from labels); needs to match a configured type name on the org. See the
  // ISSUE_TYPE_NAME table above.
  const params = new URLSearchParams({
    title: values.title,
    body,
    labels: labels.join(','),
    type: ISSUE_TYPE_NAME[values.type],
  });
  return `${GITHUB_NEW_ISSUE_URL}?${params.toString()}`;
};

/**
 * Returns a callback that submits the support request to PostHog (primary path) and then asks
 * the discord-presence Edge service to spin up a help thread (best-effort). On any Discord
 * error, falls back to the plain PostHog success toast so the user still gets feedback.
 */
const useSubmitDiscordFeedback = ({
  discordServiceUrl,
  posthogProjectId,
}: {
  discordServiceUrl: string | undefined;
  posthogProjectId: string | undefined;
}) => {
  const { invokePromise } = useOperationInvoker();

  return useCallback(
    async (values: SupportOperation.SupportRequest) => {
      if (!discordServiceUrl) {
        return;
      }

      const message = formatRequestMessage(values);

      // PostHog submission is the primary path — if it fails the error propagates
      // and no misleading toast is shown.
      const { data: eventUuid } = await invokePromise(SupportOperation.CaptureUserFeedback, {
        message,
        includeLogs: values.includeLogs,
      });

      // Open a blank popup synchronously while user activation is still valid.
      // Navigating it after the async work avoids popup-blocker policies.
      const popup = window.open('', '_blank');

      // Discord thread creation is best-effort; fall back to the PostHog toast on any error.
      try {
        const postHogEventUrl =
          posthogProjectId && eventUuid ? makePostHogEventUrl(posthogProjectId, eventUuid) : undefined;
        const res = await fetch(`${discordServiceUrl}/feedback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, postHogEventUrl }),
        });
        if (!res.ok) {
          throw new Error(`Discord service returned ${res.status}`);
        }

        const { threadUrl } = (await res.json()) as { threadUrl?: string };
        if (!threadUrl) {
          throw new Error('Discord service did not return a thread URL');
        }
        if (popup) {
          popup.location.href = threadUrl;
        } else {
          window.open(threadUrl, '_blank', 'noopener,noreferrer');
        }

        await invokePromise(LayoutOperation.UpdateComplementary, { state: 'collapsed' });
        await invokePromise(LayoutOperation.AddToast, {
          id: `${meta.id}.discord-feedback-success`,
          icon: 'ph--discord-logo--regular',
          duration: 5000,
          title: ['discord-feedback-toast.label', { ns: meta.id }],
          description: ['discord-feedback-toast.description', { ns: meta.id }],
          closeLabel: ['close.label', { ns: osTranslations }],
        });
      } catch {
        popup?.close();
        await invokePromise(LayoutOperation.UpdateComplementary, { state: 'collapsed' });
        await invokePromise(LayoutOperation.AddToast, {
          id: `${meta.id}.feedback-success`,
          icon: 'ph--paper-plane-tilt--regular',
          duration: 3000,
          title: ['feedback-toast.label', { ns: meta.id }],
          description: ['feedback-toast.description', { ns: meta.id }],
          closeLabel: ['close.label', { ns: osTranslations }],
        });
      }
    },
    [invokePromise, discordServiceUrl, posthogProjectId],
  );
};

/** Renders the feedback form, disabling it when the feedback survey is unavailable. */
export const FeedbackPanel = () => {
  const { invokePromise } = useOperationInvoker();
  const observability = useCapability(ObservabilityCapabilities.Observability);
  const [downloadLogs] = useCapabilities(ObservabilityCapabilities.LogDownloader);
  const [feedbackAvailable, setFeedbackAvailable] = useState(false);
  const config = useConfig();
  const manager = usePluginManager();

  const posthogProjectId = config.values.runtime?.app?.env?.DX_POSTHOG_PROJECT_ID as string | undefined;
  const discordServiceUrl =
    (config.values.runtime?.app?.env?.DX_DISCORD_SERVICE_URL as string | undefined) ?? DEFAULT_DISCORD_SERVICE_URL;
  // Shared with @dxos/plugin-crm (same Edge service, same multipart contract).
  const imageServiceUrl =
    (config.values.runtime?.app?.env?.DX_IMAGE_SERVICE_URL as string | undefined) ?? DEFAULT_IMAGE_SERVICE_URL;

  const version = config.values.runtime?.app?.build?.version;

  // Plugin id + name list for the "Area" picker — derived from currently-loaded plugins.
  const plugins = useMemo<FeedbackPluginOption[]>(
    () =>
      manager
        .getPlugins()
        .map((plugin) => ({ id: plugin.meta.id, name: plugin.meta.name ?? plugin.meta.id }))
        .sort(({ name: a }, { name: b }) => a.localeCompare(b)),
    [manager],
  );

  const hidden = useMemo(() => ({ version }), [version]);

  const discordPresence = useDiscordPresence(discordServiceUrl);

  useAsyncEffect(
    async (controller) => {
      const available = await observability.isAvailable('feedback').pipe(
        Effect.catchAll(() => Effect.succeed(false)),
        Effect.catchAllDefect(() => Effect.succeed(false)),
        runAndForwardErrors,
      );
      if (!controller.signal.aborted) {
        setFeedbackAvailable(available);
      }
    },
    [observability],
  );

  const handleSave = useCallback(
    async (values: SupportOperation.SupportRequest) => {
      await invokePromise(SupportOperation.CaptureUserFeedback, {
        message: formatRequestMessage(values),
        includeLogs: values.includeLogs,
      });
      await invokePromise(LayoutOperation.UpdateComplementary, {
        state: 'collapsed',
      });
      await invokePromise(LayoutOperation.AddToast, {
        id: `${meta.id}.feedback-success`,
        icon: 'ph--paper-plane-tilt--regular',
        title: ['feedback-toast.label', { ns: meta.id }],
        description: ['feedback-toast.description', { ns: meta.id }],
        closeLabel: ['close.label', { ns: osTranslations }],
        duration: 3_000,
      });
    },
    [invokePromise],
  );

  const handleDiscord = useSubmitDiscordFeedback({ discordServiceUrl, posthogProjectId });

  const handleGitHub = useCallback(
    async (values: SupportOperation.SupportRequest) => {
      // Log only the non-sensitive triage metadata — the title/body fields can
      // contain user-typed content (including PII or paths) and shouldn't be
      // emitted at info level. Screenshot URLs are likewise scrubbed below.
      log.info('github-issue: submit', {
        type: values.type,
        severity: values.severity,
        area: values.area,
        includeLogs: values.includeLogs,
        image: values.image,
        titleLength: values.title.length,
        bodyLength: values.body.length,
      });

      // Collapse the help companion before capture so the screenshot reflects
      // what the user is reporting (the screen behind the form), not the form
      // itself. A short layout tick lets the deck animation settle before
      // html-to-image walks the DOM.
      await invokePromise(LayoutOperation.UpdateComplementary, { state: 'collapsed' });
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Best-effort screenshot — only when the user opts in via the `image`
      // toggle in the form. Failures (capture or upload) drop through to the
      // no-image flow rather than blocking the report — filing the issue
      // matters more than the attachment, but we toast the failure so the
      // user knows the screenshot didn't make it.
      let screenshotUrl: string | undefined;
      let imageRequestedButFailed = false;
      if (values.image) {
        log.info('github-issue: capturing screenshot');
        const blob = await captureScreenshot();
        if (!blob) {
          log.warn('github-issue: capture returned no blob');
          imageRequestedButFailed = true;
        } else {
          log.info('github-issue: capture ok, uploading', { bytes: blob.size });
          screenshotUrl = await uploadScreenshot(blob, imageServiceUrl);
          if (!screenshotUrl) {
            log.warn('github-issue: upload returned no url');
            imageRequestedButFailed = true;
          } else {
            // URL is public but still identifies the user's screenshot; log a flag, not the URL.
            log.info('github-issue: upload ok');
          }
        }
      }

      // Phase 1: prefilled URL only. Authenticated submission via plugin-integration
      // is a follow-up — when present, POST to /repos/dxos/dxos/issues using the
      // stored AccessToken and open the resulting `html_url` instead.
      const url = buildGitHubIssueUrl(values, screenshotUrl);
      log.info('github-issue: opening', { hasScreenshot: !!screenshotUrl, urlLength: url.length });
      // Open the GH tab only once we have the final URL — no blank-popup
      // placeholder. The screenshot pipeline finishes in 1-2s in practice,
      // and modern Chrome tolerates a `window.open` for that long after a
      // user gesture (the gesture-credit window is roughly 5s). If a popup
      // blocker denies the open, `window.open` returns `null`; show a
      // distinct toast so the user knows the tab didn't appear rather than
      // leaving them with a misleading success message.
      const opened = window.open(url, '_blank', 'noopener,noreferrer');
      if (!opened) {
        log.warn('github-issue: popup blocked');
        await invokePromise(LayoutOperation.AddToast, {
          id: `${meta.id}.github-issue-popup-blocked`,
          icon: 'ph--warning--regular',
          duration: 8000,
          title: ['github-issue-popup-blocked-toast.label', { ns: meta.id }],
          description: ['github-issue-popup-blocked-toast.description', { ns: meta.id }],
          closeLabel: ['close.label', { ns: osTranslations }],
        });
        return;
      }

      await invokePromise(LayoutOperation.AddToast, {
        id: `${meta.id}.github-issue-success`,
        icon: 'ph--github-logo--regular',
        duration: 5000,
        title: ['github-issue-toast.label', { ns: meta.id }],
        description: imageRequestedButFailed
          ? ['github-issue-toast-no-screenshot.description', { ns: meta.id }]
          : ['github-issue-toast.description', { ns: meta.id }],
        closeLabel: ['close.label', { ns: osTranslations }],
      });
    },
    [invokePromise, imageServiceUrl],
  );

  return (
    <FeedbackForm
      hidden={hidden}
      plugins={plugins}
      discordPresence={discordPresence ?? undefined}
      // GH only opens a prefilled URL — independent of PostHog feedback availability.
      // PostHog + Discord both call `CaptureUserFeedback`, so they share the gate.
      disabled={{ posthog: !feedbackAvailable, discord: !feedbackAvailable }}
      onDownloadLogs={downloadLogs}
      onSave={handleSave}
      onDiscord={handleDiscord}
      onGitHub={handleGitHub}
    />
  );
};
