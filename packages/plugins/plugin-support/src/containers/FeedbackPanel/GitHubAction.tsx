//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { EdgeServiceName, getEdgeServiceEndpoint } from '@dxos/config';
import { log } from '@dxos/log';
import { useConfig } from '@dxos/react-client';
import { osTranslations } from '@dxos/ui-theme';

import { FeedbackForm, type FeedbackSubmitHandler } from '#components';
import { meta } from '#meta';
import { SupportOperation } from '#types';

import { GITHUB_NEW_ISSUE_URL } from '../../constants';
import { captureScreenshot, uploadScreenshot } from './screenshot';

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
 * Opens a prefilled GitHub "new issue" URL built from the form values, optionally attaching an
 * uploaded screenshot. Independent of PostHog feedback availability.
 */
export const GitHubAction = () => {
  const { invokePromise } = useOperationInvoker();
  const config = useConfig();
  // Shared with @dxos/plugin-crm (same Edge service, same multipart contract).
  const imageServiceUrl =
    (config.values.runtime?.app?.env?.DX_IMAGE_SERVICE_URL as string | undefined) ??
    getEdgeServiceEndpoint(config, EdgeServiceName.Image);

  const handleGitHub = useCallback<FeedbackSubmitHandler>(
    async (values) => {
      // Claim the popup synchronously while the user gesture is still active — Safari/Firefox
      // expire transient activation across the awaited screenshot work, so a deferred
      // `window.open` would be blocked. Navigate this tab once the final URL is built. (No
      // `noopener` here: that forces `window.open` to return null; we drop the opener manually.)
      const popup = window.open('about:blank', '_blank');

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
      // If the synchronous open was blocked, `popup` is null; show a distinct toast so the user
      // knows the tab didn't appear rather than leaving them with a misleading success message.
      if (!popup) {
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

      // Drop the opener for security, then navigate the already-open tab to the prefilled URL.
      popup.opener = null;
      popup.location.href = url;

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

  return <FeedbackForm.SubmitGitHub onSubmit={handleGitHub} />;
};
