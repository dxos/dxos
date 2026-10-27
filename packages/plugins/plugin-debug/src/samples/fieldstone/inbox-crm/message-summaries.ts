//
// Copyright 2026 DXOS.org
//

/** Key of a message's summary: its thread's subject, its sender's key and its day before the reference date. */
export const messageSummaryKey = (subject: string, from: string, day: number): string => `${subject}|${from}|${day}`;

/**
 * AI summaries of the ten most recent messages in the inbox, keyed by {@link messageSummaryKey}.
 * Each is filed in the annotations feed against its own message.
 */
export const MESSAGE_SUMMARIES: Record<string, string> = {
  [messageSummaryKey('Meridian paid plan proposal', 'lucia', 0)]:
    `Lucía confirms she has revised the Meridian order form as Aisha asked: 60 seats now with a ramp to 90 at the same rate, and the SOC 2 Type I delivery date written in as a contract clause. She has invited Aisha and Kenji to a Wednesday review before the form goes to procurement.

**Key points**
- Seat ramp added: 60 seats today, up to 90 by June, at $40 a seat per month on Enterprise.
- The SOC 2 Type I condition from Kenji's sign-off is now a clause in the order form, not an email.
- Review call set for Wednesday with Aisha and Kenji.

**Asks and deadlines**
- No ask of Astrid in this message. The SOC 2 Type I report must reach Meridian within 60 days of Kenji's sign-off.

**Suggested next actions**
- Confirm the auditor's Type I report date before Wednesday, since it is now contractual.
- Update the Meridian deal in the Sales pipeline: proposal sent with ramp, review Wednesday.`,

  [messageSummaryKey('Remote cache for a Bazel monorepo at Kestrel', 'owen', 0)]:
    `Owen accepts that Cairn does not offer remote execution for now and confirms the discovery call for Friday next week. He will bring two Bazel build event logs, one clean and one incremental, so Kofi can show the expected hit rate.

**Key points**
- No remote execution is acceptable to Kestrel for now; remote caching over gRPC is what they need.
- Discovery call accepted for Friday next week.
- Owen brings a clean and an incremental build event log.

**Asks and deadlines**
- None for Astrid. Kofi should be ready to analyse both logs on the call.

**Suggested next actions**
- Ask Kofi to prepare the hit-rate analysis from the event logs and a sizing for 140 engineers and 9,000 targets.
- Ask Lucía for an exact Business plan quote, around $3,500 a month, to share after the call.
- Move the Kestrel deal from Lead to Qualified after the call if the logs support it.`,

  [messageSummaryKey('Brightwater intro and pricing', 'leo', 1)]:
    `Leo agrees to Lucía's proposal of a two-week trial on Brightwater's main Perforce stream and confirms that he and Mila will both join Monday's intro call.

**Key points**
- Brightwater accepts the trial approach before committing to Business for 40 engineers.
- The trial runs on their main stream, not a side stream.
- Leo (CTO) and Mila (build team lead) both attend Monday's call.

**Asks and deadlines**
- Brightwater wants a cache in place before their next milestone build, about six weeks out from Leo's first email.

**Suggested next actions**
- Have Kofi prepare a trial plan for two of their 12 Windows build agents, covering C++ compilation and asset cooking.
- Agree success criteria on Monday, for example the cut in their 50-minute CI build.
- Keep the Brightwater deal in Demo and set its next step to the trial kickoff.`,

  [messageSummaryKey('Meridian paid plan proposal', 'aisha', 1)]:
    `Aisha replies to the paid-plan proposal: Meridian starts with 60 seats but two more teams join in Q2, so she asks for a ramp to 90 seats by June. Procurement also wants the SOC 2 condition written into the order form, and she asks to review it together next week before it goes to them.

**Key points**
- Seat count: 60 now, 90 by June.
- Procurement requires the SOC 2 Type I condition in the order form itself.
- Aisha wants a joint review before procurement sees it.

**Asks and deadlines**
- Add the seat ramp to the proposal.
- Write the SOC 2 condition into the order form.
- Schedule a review next week.

**Suggested next actions**
- Lucía revises the order form with the ramp and the SOC 2 clause.
- Book the review with Aisha and Kenji.
- Update the deal value in the Sales pipeline to reflect the ramp to 90 seats.`,

  [messageSummaryKey('Question on the S3 multipart retry change', 'tomas', 1)]:
    `Tomás asks Felix whether the S3 multipart retry change affects upload progress events. When a part retries, the dashboard progress bar stalls long enough on slow links that people assume the upload has failed.

**Key points**
- The retry with backoff on 503 is part of Cairn 1.8.
- A retrying part currently looks like a stalled upload in the dashboard.
- Tomás proposes that the agent emit a retry event so the UI can show "retrying part 3 of 12".

**Asks and deadlines**
- Felix to say whether the agent can emit a retry progress event. No deadline, but 1.8 ships on Friday.

**Suggested next actions**
- Decide whether the retry event goes into 1.8 or waits for 1.9, given the release freeze.
- If it waits, add a release note so customers know a stalled bar may be a retry.
- Open an issue in alien-labs/cairn to track the agent event and the dashboard change.`,

  [messageSummaryKey('Interview scheduling: Dev Malhotra and Yusuf Demir', 'astrid', 1)]:
    `Astrid tells Omar and Hana about two upcoming backend interview loops: Dev Malhotra on Wednesday next week and Yusuf Demir that Friday, both led by Omar. She asks Hana to shadow Dev's loop as preparation for running one herself next quarter.

**Key points**
- Two backend loops next week; Omar leads both.
- Hana shadows the Dev Malhotra loop.
- Hana takes notes and writes her own scorecard to compare with the panel's.

**Asks and deadlines**
- Hana to confirm she can shadow on Wednesday.
- Scorecards before the debrief, written independently.

**Suggested next actions**
- Send Hana the interview loop guide and scorecard template.
- Confirm both candidates' times with the panel calendars.
- Plan for Hana to run her own loop next quarter.`,

  [messageSummaryKey('Remote cache for a Bazel monorepo at Kestrel', 'kofi', 1)]:
    `Kofi answers Owen's three questions. Cairn supports Bazel remote caching over gRPC but not remote execution; data is stored on Cloudflare R2 in the US by default with an EU option; and 140 engineers would be on Business at around $3,500 a month. He proposes a discovery call next week with a recent build event log.

**Key points**
- Remote caching: yes, with standard Bazel flags. Remote execution: no.
- Storage: Cloudflare R2, US by default, EU available.
- Price: Business plan, about $3,500 a month for 140 engineers; Lucía to confirm the exact figure.

**Asks and deadlines**
- Owen to book a discovery call next week and bring a build event log.

**Suggested next actions**
- Ask Lucía for an exact quote before the call.
- Prepare a short comparison against their self-hosted bazel-remote on two machines.
- Track the Kestrel deal in the Sales pipeline with Kofi as owner.`,

  [messageSummaryKey('Cairn 1.8 release notes draft', 'astrid', 1)]:
    `Astrid approves the Scribe's draft of the Cairn 1.8 release notes with three changes: lead with the runner-image cache key change and credit Okapi for the report, drop the flaky test fix, and move the upgrade note up under the highlights.

**Key points**
- The runner-image digest in the cache key is the headline; Nadia agreed to the credit for Okapi.
- The flaky eviction test line goes, since customers do not care about it.
- The upgrade note about the first cold build per runner image moves under the highlights.

**Asks and deadlines**
- The Scribe revises the draft before Friday's release.

**Suggested next actions**
- Check the revised draft before Friday.
- Share the final notes with Kofi for the announcement and the GitHub partner listing of setup-cairn.
- Give on-call a heads-up about the cold builds that follow the upgrade.`,

  [messageSummaryKey('Remote cache for a Bazel monorepo at Kestrel', 'owen', 2)]:
    `Owen Fairley, Build Infrastructure Lead at Kestrel Energy, writes in after reading a Cache Line issue on affected-target detection. Kestrel runs one Bazel monorepo with 140 engineers and about 9,000 targets on a self-hosted bazel-remote that they keep resizing, and they want to stop running the cache themselves.

**Key points**
- Inbound lead from the Cache Line newsletter.
- Current setup: self-hosted bazel-remote on two machines.
- Goal: hand off cache operations to a managed service.

**Asks and deadlines**
- Do you support the Bazel remote APIs, including remote execution?
- Where is the data stored?
- What does a team of 140 engineers pay?

**Suggested next actions**
- Have Kofi reply with answers to all three questions and propose a discovery call.
- Copy Lucía for pricing.
- Add Kestrel Energy to the Sales pipeline as a Lead for the Business plan.`,

  [messageSummaryKey('Brightwater intro and pricing', 'lucia', 2)]:
    `Lucía answers Mila's Perforce question and sends pricing. The Cairn agent keys on file contents rather than commits, so Perforce is not a problem. Business for 40 engineers is about $1,800 a month, and she proposes a two-week trial on one stream with Kofi helping Mila set it up.

**Key points**
- Perforce works: caching depends on file contents, not on git commits.
- Price: $1,240 for seats plus $559 for storage ($499 base with 2 TB, plus $60 for the third terabyte), about $1,800 a month.
- Proposal: a two-week trial on one stream, set up on two of their 12 build agents.
- Lucía has sent an invite for an intro call next Monday.

**Asks and deadlines**
- Brightwater to accept the trial and the Monday call.

**Suggested next actions**
- Have Kofi prepare the trial setup for Windows agents with Unreal C++ compilation and asset cooking.
- Track the Brightwater deal in Demo with the trial as the next step.`,
};
