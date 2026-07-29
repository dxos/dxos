//
// Copyright 2026 DXOS.org
//

/**
 * A single hand-authored sample message used to seed inbox/search storybooks.
 * Deliberately schema-free (no `@dxos/types`/`@dxos/echo`/`@dxos/schema`) so that
 * `@dxos/plugin-testing` — which does not depend on those packages — can host it.
 */
export type SampleMessage = {
  from: { email: string; name: string };
  subject: string;
  body: string;
  topic: 'project' | 'finance' | 'scheduling' | 'hiring' | 'ops';
  /** Optional thread grouping id. */
  threadId?: string;
  /** How many days before "now" the message was sent (for deterministic ordering). */
  daysAgo?: number;
};

/**
 * ~18 realistic sample messages spread across five topics (project, finance,
 * scheduling, hiring, ops). Search terms such as "invoice", "meeting", "project",
 * and "migration" are repeated across multiple messages so full-text search
 * storybook demos return multiple hits. Consumed by plugin-inbox and
 * plugin-search storybooks.
 */
export const SAMPLE_MESSAGES: SampleMessage[] = [
  {
    from: { email: 'priya.natarajan@example.com', name: 'Priya Natarajan' },
    subject: 'Apollo project kickoff scheduled',
    body: 'The Apollo project kicks off Monday at 10am. Please review the attached roadmap before the meeting so we can agree on the first sprint deadline. This project spans three teams and the deadline for phase one is set for next month.',
    topic: 'project',
    threadId: 'apollo-kickoff',
    daysAgo: 12,
  },
  {
    from: { email: 'marcus.oyelaran@example.com', name: 'Marcus Oyelaran' },
    subject: 'Re: Apollo project kickoff scheduled',
    body: 'Thanks for the summary. I have added the sprint deadline to the shared calendar and flagged two risks in the project plan that need owner sign-off before the release.',
    topic: 'project',
    threadId: 'apollo-kickoff',
    daysAgo: 11,
  },
  {
    from: { email: 'diego.fuentes@example.com', name: 'Diego Fuentes' },
    subject: 'Sprint 14 release notes',
    body: 'Sprint 14 wrapped up yesterday and the release is scheduled for Thursday. The project board shows all critical tickets closed; only the deadline for documentation updates remains open.',
    topic: 'project',
    daysAgo: 8,
  },
  {
    from: { email: 'hannah.liu@example.com', name: 'Hannah Liu' },
    subject: 'Design review moved up',
    body: 'The design review for the onboarding project has been moved up a week to accommodate the release deadline. Please send feedback on the mockups before Friday so the team can finalize the spec.',
    topic: 'project',
    daysAgo: 6,
  },
  {
    from: { email: 'billing@northgate-supplies.com', name: 'Northgate Supplies Billing' },
    subject: 'Invoice #12345 due Friday',
    body: 'This is a reminder that invoice #12345 for office equipment is due Friday. Payment can be made by wire transfer or card; let us know if you need a revised invoice with updated line items.',
    topic: 'finance',
    threadId: 'northgate-invoice',
    daysAgo: 5,
  },
  {
    from: { email: 'accounts@northgate-supplies.com', name: 'Northgate Supplies Accounts' },
    subject: 'Re: Invoice #12345 due Friday',
    body: 'We have received your payment confirmation for invoice #12345. Thank you for the prompt payment; a receipt is attached for your records.',
    topic: 'finance',
    threadId: 'northgate-invoice',
    daysAgo: 4,
  },
  {
    from: { email: 'finance.ops@example.com', name: 'Finance Operations' },
    subject: 'Q3 expense report reminder',
    body: 'Quarterly expense reports are due by the end of the week. Any outstanding reimbursement requests should include the original invoice; late submissions may delay payment processing until next cycle.',
    topic: 'finance',
    daysAgo: 9,
  },
  {
    from: { email: 'sofia.marchetti@example.com', name: 'Sofia Marchetti' },
    subject: 'Vendor contract renewal and payment terms',
    body: 'The vendor contract renewal includes updated payment terms, moving from net-30 to net-45. Please review the redlines and confirm before we send the signed copy back with the next invoice cycle.',
    topic: 'finance',
    daysAgo: 15,
  },
  {
    from: { email: 'grace.kimathi@example.com', name: 'Grace Kimathi' },
    subject: 'Reschedule the design review',
    body: 'Can we reschedule the design review meeting to Wednesday afternoon? A conflicting client meeting came up and I want to make sure the whole team can attend without rushing the agenda.',
    topic: 'scheduling',
    daysAgo: 7,
  },
  {
    from: { email: 'tom.whitfield@example.com', name: 'Tom Whitfield' },
    subject: 'Weekly sync meeting moved to Tuesdays',
    body: 'Starting next week, the weekly sync meeting moves from Monday to Tuesday at 9am. Please update your calendar; the room booking and video link stay the same as the previous schedule.',
    topic: 'scheduling',
    daysAgo: 14,
  },
  {
    from: { email: 'amara.osei@example.com', name: 'Amara Osei' },
    subject: 'All-hands meeting agenda for Friday',
    body: "Attached is the agenda for Friday's all-hands meeting. We will cover the roadmap update, a hiring update, and open Q&A; please add topics to the shared doc if you would like time on the schedule.",
    topic: 'scheduling',
    daysAgo: 3,
  },
  {
    from: { email: 'liu.wenjie@example.com', name: 'Liu Wenjie' },
    subject: 'Confirming 1:1 schedule for next month',
    body: 'I would like to confirm our 1:1 schedule for next month stays biweekly on Thursdays. Let me know if you need to reschedule any of the upcoming sessions around the holiday.',
    topic: 'scheduling',
    daysAgo: 20,
  },
  {
    from: { email: 'recruiting@example.com', name: 'Recruiting Team' },
    subject: 'Interview loop for the backend candidate',
    body: 'We have scheduled the interview loop for the backend candidate for next Tuesday: system design, coding, and a hiring manager chat. Please confirm your interview slot and submit feedback within 24 hours.',
    topic: 'hiring',
    threadId: 'backend-candidate',
    daysAgo: 10,
  },
  {
    from: { email: 'noah.bergstrom@example.com', name: 'Noah Bergstrom' },
    subject: 'Re: Interview loop for the backend candidate',
    body: 'I finished my interview with the candidate this morning. Strong signal on system design; recommend we move to the hire decision quickly before another offer comes in.',
    topic: 'hiring',
    threadId: 'backend-candidate',
    daysAgo: 9,
  },
  {
    from: { email: 'people.ops@example.com', name: 'People Ops' },
    subject: 'Offer approved for product designer role',
    body: 'The hiring committee approved an offer for the product designer candidate. Please prepare the offer letter and coordinate with recruiting on the start date before we extend it this week.',
    topic: 'hiring',
    daysAgo: 2,
  },
  {
    from: { email: 'ines.delgado@example.com', name: 'Ines Delgado' },
    subject: 'Panel interview feedback needed',
    body: "Please submit your panel interview feedback for the platform candidate by end of day. We are trying to close out the hiring decision before the candidate's other offer deadline.",
    topic: 'hiring',
    daysAgo: 1,
  },
  {
    from: { email: 'ops.oncall@example.com', name: 'Ops On-Call' },
    subject: 'Database migration window this weekend',
    body: 'The database migration is scheduled for this weekend during the low-traffic window. Expect brief read-only mode while the migration completes; the runbook and rollback plan are linked below.',
    topic: 'ops',
    threadId: 'db-migration',
    daysAgo: 4,
  },
  {
    from: { email: 'security.team@example.com', name: 'Security Team' },
    subject: 'Security audit findings summary',
    body: 'The quarterly security audit identified two medium-severity findings, both scheduled for remediation before the next migration cycle. Full details and the incident timeline are in the attached report.',
    topic: 'ops',
    daysAgo: 13,
  },
  {
    from: { email: 'ops.oncall@example.com', name: 'Ops On-Call' },
    subject: 'Post-incident review: brief outage',
    body: "Following last night's brief outage, the incident review identified a misconfigured cache as root cause. A follow-up migration of the affected service is planned to prevent recurrence.",
    topic: 'ops',
    threadId: 'db-migration',
    daysAgo: 3,
  },
];
