//
// Copyright 2026 DXOS.org
//

import { type Support } from '../types/index.ts';

/** A canonical document as the demo seeds it: a title and headed sections. */
export type CanonicalDocument = {
  readonly title: string;
  readonly sections: ReadonlyArray<{ readonly heading: string; readonly text: string }>;
};

/**
 * The support team's canonical documents. Every figure is from the Cloudflare documentation as of 2026-11
 * (developers.cloudflare.com: workers/platform/limits, kv, durable-objects, workers/configuration/cron-triggers).
 */
export const CANONICAL_DOCUMENTS: readonly CanonicalDocument[] = [
  {
    title: 'Workers platform limits',
    sections: [
      {
        heading: 'CPU time',
        text: 'CPU time is the time a Worker spends executing code; waiting on the network does not count. On the Free plan the CPU time limit is 10 ms per request. On the Paid plan the limit is 30 seconds by default and can be raised to 5 minutes by setting limits.cpu_ms in the Wrangler configuration.',
      },
      {
        heading: 'Memory',
        text: 'Each isolate can use up to 128 MB of memory on both the Free and the Paid plan.',
      },
      {
        heading: 'Subrequests',
        text: 'A subrequest is a request a Worker makes with fetch or to another Cloudflare service. On the Free plan a Worker can make 50 subrequests in one request. On the Paid plan a Worker can make 10,000 subrequests in one request by default, and up to 10 million by setting limits.subrequests in the Wrangler configuration.',
      },
    ],
  },
  {
    title: 'Workers KV',
    sections: [
      {
        heading: 'Consistency',
        text: 'KV is eventually consistent. A write is visible at once in the location where it was made, and can take up to 60 seconds to be visible in other regions.',
      },
      {
        heading: 'Limits',
        text: 'The largest value you can store in KV is 25 MiB. The same key can be written once a second.',
      },
    ],
  },
  {
    title: 'Durable Objects',
    sections: [
      {
        heading: 'Alarms',
        text: 'A Durable Object can schedule one alarm at a time. Alarms are guaranteed to execute at least once. If the alarm handler throws, the alarm is retried with exponential backoff, starting 2 seconds after the first failure, up to 6 times.',
      },
      {
        heading: 'Storage',
        text: 'The storage limit is 10 GB per Durable Object on the Paid plan. Storage per account is not limited on the Paid plan.',
      },
    ],
  },
  {
    title: 'Cron Triggers',
    sections: [
      {
        heading: 'Schedule',
        text: 'Cron Triggers run on UTC time, not local time. Add the schedules to triggers.crons in the Wrangler configuration.',
      },
      {
        heading: 'Local testing',
        text: 'To test a Cron Trigger locally, start wrangler dev with --test-scheduled and request /cdn-cgi/local/scheduled, passing the schedule in the cron query parameter.',
      },
    ],
  },
  {
    title: 'Secrets',
    sections: [
      {
        heading: 'Adding a secret',
        text: 'Add a secret to a deployed Worker with wrangler secret put and the name of the secret. The value is encrypted and is not shown again.',
      },
      {
        heading: 'Local development',
        text: 'For local development put secrets in a .dev.vars file beside the Wrangler configuration. Do not commit the file.',
      },
    ],
  },
];

/** A canonical document as the markdown stored in the space. */
export const toMarkdown = ({ title, sections }: CanonicalDocument): string =>
  [`# ${title}`, ...sections.map(({ heading, text }) => `## ${heading}\n\n${text}`)].join('\n\n');

/** The headed sections of a markdown document; text before the first `##` heading belongs to no passage. */
export const passagesOf = ({
  document,
  title,
  content,
}: {
  document: string;
  title: string;
  content: string;
}): Support.Passage[] =>
  content
    .split(/^## /m)
    .slice(1)
    .map((section) => {
      const [heading = '', ...body] = section.split('\n');
      return { document, title, heading: heading.trim(), text: body.join(' ').replace(/\s+/g, ' ').trim() };
    })
    .filter((passage) => passage.text.length > 0);
