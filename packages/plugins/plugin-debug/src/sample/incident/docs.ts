//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database } from '@dxos/echo';
import * as Markdown from '@dxos/plugin-markdown/Markdown';

//
// The source material: one machine record and four human notes.
//
// The log alone gives the technical cause and every time that matters. The notes are the only place
// the process failures live — who was paged, where the renewal reminder was kept, how support found
// an engineer — and two of them carry claims the log contradicts. A retro that follows the notes
// without checking them against the log recommends the wrong things; one that reads only the log
// finds nothing to recommend at all.
//

const STATUS_LOG_MD = `# Status log — incident 0516

Exported from the status service. Times are UTC, Saturday 16 May.

| Time | Source | Event |
| --- | --- | --- |
| 02:00:04 | edge | TLS handshake failures begin on api.northlight.example — certificate expired 2026-05-16T02:00:00Z |
| 02:00:30 | edge | Error rate on api.* rises from 0% to 98% |
| 02:03:11 | alerts | PAGE fired: "api error rate > 50%" — rotation platform-oncall, pager target m.okafor |
| 02:03:12 | alerts | Page delivered to m.okafor. No acknowledgement. |
| 02:33:11 | alerts | Page re-sent to m.okafor. No acknowledgement. |
| 03:31:47 | support | Ticket #4471 opened from customer email (Ferrous Ltd): "API down since about 2am" |
| 04:41:09 | alerts | Page acknowledged by j.reyes via Slack |
| 04:52:30 | ops | Incident channel #inc-0516 opened by j.reyes |
| 05:09:55 | ops | Certificate renewed manually by j.reyes using the shared ACME account |
| 05:12:18 | edge | TLS handshakes succeeding; error rate on api.* falls from 98% to 0.2% |
| 05:12:18 | ops | Incident resolved |

No deploys, configuration changes or infrastructure events were recorded between 15 May 12:00 and
16 May 05:12. Database disk usage held at 41% throughout.
`;

const NOTE_JAE_MD = `# Notes from Jae Reyes — platform, on call that weekend

I was not paged. I found out when Priya messaged me on Slack a little after half four, and I had
the cert renewed about half an hour later once I worked out that was what it was.

Afterwards I looked at the pager config. The platform on-call rotation still lists Mira Okafor as
the target. Mira moved to the data team in March. Nobody updated the rotation when the team
changed, so for two months every page for our services has gone to someone who is no longer on
the team.

My guess is something went out on Friday afternoon that broke TLS termination. We should stop
Friday deploys.
`;

const NOTE_PRIYA_MD = `# Notes from Priya Nair — support lead

Ferrous emailed at about half three saying the API had been down since two. I opened a ticket and
then tried to find someone. I did not know who was on call or how to reach the pager, so I messaged
two people on the platform team who did not answer, and then Jae, who did, at around half four.

There is no written path from support to on-call for weekends. During the week I would ask in the
platform channel. On Saturday night nobody is reading it. I made three guesses at who to contact
and the third one was right, and that is the only reason this was three hours and not six.
`;

const NOTE_DAN_MD = `# Notes from Dan Walsh — platform, renewed the certificate last year

The certificate for api.northlight.example is renewed by hand once a year. I did it on 15 May last
year. There is no ACME automation for that domain because its DNS is managed by a third party and
we never finished the delegation work.

The reminder to renew it was a calendar event on Tom's calendar. Tom left in January. When his
account was closed the event went with it, and nobody had a copy. I only remembered the date
because Jae asked me on Saturday.
`;

const NOTE_SAM_MD = `# Notes from Sam Lindqvist — product

I was not online over the weekend, so this is second hand. I heard on Monday that the database
ran out of disk and that is what took the API down.

Three customers have asked for a summary they can forward internally. They do not need the
technical detail; they need to know what happened, how long it lasted, and that it will not
happen again.
`;

export type DocsResult = {
  log: Markdown.Document;
  notes: {
    jae: Markdown.Document;
    priya: Markdown.Document;
    dan: Markdown.Document;
    sam: Markdown.Document;
  };
};

/** The record and the recollections the retro is written from. */
export const Docs: SampleSpace.Phase<DocsResult> = SampleSpace.phase('docs', {
  schemas: [Markdown.Document],
  run: () =>
    Effect.gen(function* () {
      const log = yield* Database.add(Markdown.make({ name: 'Status log', content: STATUS_LOG_MD }));
      const jae = yield* Database.add(Markdown.make({ name: 'Notes — Jae Reyes', content: NOTE_JAE_MD }));
      const priya = yield* Database.add(Markdown.make({ name: 'Notes — Priya Nair', content: NOTE_PRIYA_MD }));
      const dan = yield* Database.add(Markdown.make({ name: 'Notes — Dan Walsh', content: NOTE_DAN_MD }));
      const sam = yield* Database.add(Markdown.make({ name: 'Notes — Sam Lindqvist', content: NOTE_SAM_MD }));
      return { log, notes: { jae, priya, dan, sam } };
    }),
});
