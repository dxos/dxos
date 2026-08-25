---
title: 'DXOS Privacy Policy'
description: 'DXOS Privacy Policy'
---

## Summary

DXOS provides developers with everything they need to build real-time, collaborative apps which run on the client and communicate peer-to-peer. Our database architecture replicates user-created content between your devices and collaborators. When you use hosted features of Composer — such as sync, backup, automations, or third-party account connections — your workspace data is also replicated to infrastructure we operate, as described below.

This Privacy Policy outlines how we collect, use, and protect data when you use our software, website, and platform. We are committed to ensuring the privacy and security of your personal information.

## What information do we collect?

### Observability data

DXOS collects app and platform observability data for the sole purpose of making our products and SDK better. You can opt out of the collection of this data in our applications and CLI.

We collect information when you:

- Visit our website and documentation
- Use [Composer](https://dxos.org/composer)
- Use our CLI to [develop applications using the DXOS SDK](https://docs.dxos.org/guide/cli)

We collect the following information:

- A randomized ID that is generated when you first use Composer or install the CLI
- Performance and reliability metrics, such as memory usage, peer network connections, and number/size of documents
- Information about your device and environment, such as the operating system, browser, and location based on IP address
- Error logs and diagnostics

Observability data never includes the content of your workspaces.

### Workspace content

Content you create in Composer belongs to you. When you enable hosted sync, your workspace data is stored on infrastructure we operate (hosted on Cloudflare) so that it can be synchronized between your devices, shared with collaborators you choose, and processed by automations you configure. Workspace content is used only to provide these features. We do not sell it, use it for advertising, or read it, except with your explicit consent (for example, a support request you initiate), for security purposes, or as required by law.

## Google user data

When you connect a Google account to Composer, we access the following data through Google's APIs, with your consent, solely to provide the features you use:

- **Gmail messages and labels** (`gmail.modify` scope): we sync your messages — headers, body, and labels — into your private Composer workspace so you can read, organize, archive, trash, and reply to mail from Composer. Actions you take in Composer (archive, trash, label changes, sending) are applied to your Gmail account on your behalf.
- **Sending mail** (`gmail.send` scope): messages you compose in Composer are sent through your own Gmail account.
- **Email address** (`userinfo.email`): used to label the connected account in the app.
- **Calendar** (`calendar.readonly`, `calendar.events`): to list your calendars, sync events you choose, and create events you author in Composer.
- **Contacts** (`contacts.readonly`): to import your contacts into your workspace address book.

### Where this data lives

Synced Google data is stored in your private workspace on infrastructure we operate, hosted on Cloudflare. Message data and the OAuth tokens that authorize our access are encrypted at rest using keys we manage, with key rotation. Routine access within our systems is limited to the automated services that provide these features; humans access this data only with your explicit consent, for security purposes, or as required by law, as described under Limited Use below.

### Limited Use

Our use of information received from Google APIs adheres to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements. Specifically:

- We only use Google user data to provide the user-facing features described here.
- We do not sell Google user data, use it for advertising, or transfer it for purposes beyond providing these features.
- No human reads your data except with your explicit consent, for security purposes, or as required by law.
- We do not use Google user data to develop, improve, or train generalized AI or machine learning models.

### AI features and your consent

Composer offers optional AI features (for example, classifying and summarizing your mail). These features send content to our AI model provider (currently Anthropic) under terms that prohibit training models on your data. AI features that process your Google data are off until you enable them: we ask for your explicit consent in the app before any message content is processed by a model provider, and you can withdraw consent at any time in settings.

### Retention and deletion

Synced data remains in your workspace until you delete it. You can:

- delete individual messages or mailboxes in the app;
- disconnect your Google account, which revokes our access token with Google and deletes stored tokens; or
- delete your workspace or account, which permanently deletes all synced Google data from our systems.

You can also revoke our access at any time at [myaccount.google.com/permissions](https://myaccount.google.com/permissions).

## How do we collect this information?

App and platform observability data is collected using the DXOS SDK, which uses third-party providers to store and process the data. Data generated by website visits is collected automatically when you visit our websites through the use of various technologies, such as cookies and request headers.

## Where is the data stored and processed? How is it protected?

The data collected is stored on our servers and our providers:

- We use Cloudflare to host Composer's sync, storage, and automation infrastructure
- We use Anthropic to provide AI features, when you enable them
- We use PostHog to receive telemetry data from our applications and websites
- We use Sentry to capture error logs when things don't go as planned
- We use Datadog to record performance and reliability metrics, and to monitor our infrastructure

We take reasonable measures to protect your information from unauthorized access, use, or disclosure, including encryption in transit and at rest. However, no Internet transmission is entirely secure, and we cannot guarantee the security of your information.

We do not sell or rent your personal information to third parties.

## Changes to This Privacy Policy

We're continuing to shape and improve our applications and SDK, with your user privacy and security in mind.

We may update this Privacy Policy from time to time. Changes to the policy will be made to this page and will be effective upon publication of the changes.

If you have any questions about this Privacy Policy, please contact us at [**privacy@dxos.org**](mailto:privacy@dxos.org).
