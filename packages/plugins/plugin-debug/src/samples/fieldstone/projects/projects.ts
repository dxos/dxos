//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import * as Skill from '@dxos/compute/Skill';
import { Database, Obj, Ref } from '@dxos/echo';
import type * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import { type Event, type Message, type Organization, type Person, Repo, type TaskSet } from '@dxos/types';

import { type Provides as TeamProvides } from '../team/index.ts';
import { type Artifacts } from './docs.ts';
import { PROJECT_NAMES, type ProjectKey } from './tasks.ts';

/** What the Links section reads from inbox-crm, when the template includes it. */
export type InboxCrmLinks = {
  readonly orgs: Record<'stripe' | 'meridian' | 'okapi' | 'saltmarsh', Organization.Organization>;
  readonly people: Record<'dana' | 'aisha' | 'nadia' | 'wren', Person.Person>;
  readonly mailbox: Mailbox.Mailbox;
  readonly threads: Record<'stripeBilling' | 'meridianSecurity' | 'okapiIncident', ReadonlyArray<Message.Message>>;
  readonly events: Record<'offsite', ReadonlyArray<Event.Event>>;
};

/** The subject a thread is filed under, as the inbox shows it. */
export const threadSubject = (thread: ReadonlyArray<Message.Message>): string | undefined => {
  const subject = thread[0]?.properties?.subject;
  return typeof subject === 'string' ? subject : undefined;
};

const BASE_SKILLS = ['org.dxos.skill.project', 'org.dxos.skill.markdown', 'org.dxos.skill.database'] as const;

const INBOX_SKILL = 'org.dxos.skill.inbox';

const skillRefs = (keys: ReadonlyArray<string>) => keys.map((key) => Ref.fromURI(Skill.registryURI(key)));

const paragraph = (...sentences: string[]) => sentences.join(' ');

const REPO_SEEDS = [
  {
    key: 'cairn',
    name: 'cairn',
    description: 'Cairn: the cache server (Go, internal/), the CLI (TypeScript, cli/) and the dashboard.',
  },
  { key: 'policies', name: 'policies', description: 'Security and compliance policies, as Markdown.' },
  { key: 'handbook', name: 'handbook', description: 'The team handbook, including the offsite pages.' },
] as const;

type RepoKey = (typeof REPO_SEEDS)[number]['key'];

type ProjectSeed = {
  readonly description: string;
  readonly repo: RepoKey;
  readonly artifacts: ReadonlyArray<keyof Artifacts>;
  readonly instructions: (links: InboxCrmLinks | undefined) => string;
  readonly context: (team: TeamProvides, links: InboxCrmLinks | undefined) => ReadonlyArray<Obj.Unknown>;
};

const PROJECT_SEEDS: Record<ProjectKey, ProjectSeed> = {
  cache: {
    description: 'Content-addressed storage, a sharded index and a smarter edge tier, shipping as Cairn 1.8.',
    repo: 'cairn',
    artifacts: ['cacheDesign', 'releaseNotes'],
    instructions: () =>
      [
        paragraph(
          'This project ships Cairn 1.8 and the v2 remote cache: content-addressed storage, a sharded index and a',
          'size-aware edge tier, as written in "Remote cache v2 design".',
        ),
        paragraph(
          'Code lives in alien-labs/cairn: the server is Go under internal/, the CLI is TypeScript under cli/. Open one',
          'pull request per task and name the task in its description. Omar Haddad owns the cache engine and reviews',
          'anything that touches the index; hand index changes to Reviewer before asking him.',
        ),
      ].join('\n\n'),
    context: (team, links) => [team.people.omar, ...(links ? [links.orgs.okapi, links.people.nadia] : [])],
  },
  billing: {
    description: 'Move Cairn from three flat tiers to usage pricing on Stripe: GB stored and cache hits.',
    repo: 'cairn',
    artifacts: ['billingPlan'],
    instructions: (links) =>
      [
        paragraph(
          'This project moves Cairn from flat-rate plans to usage-based billing on Stripe Meters. Prices, dates and',
          'rules come from "Billing migration plan"; never put a price in code.',
        ),
        paragraph(
          'June Okonkwo owns billing and answers any pricing or customer-mapping question; ask her rather than guess.',
          ...(links?.threads.stripeBilling && threadSubject(links.threads.stripeBilling)
            ? [`Stripe's side of the migration is in the "${threadSubject(links.threads.stripeBilling)}" thread.`]
            : []),
        ),
      ].join('\n\n'),
    context: (team, links) => [
      team.people.june,
      ...(links ? [links.orgs.stripe, links.people.dana, links.mailbox] : []),
    ],
  },
  soc2: {
    description: 'Policies, evidence and an auditor, so Alien Labs can pass a SOC 2 Type I audit.',
    repo: 'policies',
    artifacts: ['soc2Policies'],
    instructions: (links) =>
      [
        paragraph(
          'This project gets Alien Labs ready for a SOC 2 Type I audit. Write policies from how the team works today,',
          'not from templates, into "SOC 2 policy set"; flag a gap instead of inventing a process to cover it.',
        ),
        paragraph(
          'Anika Rao owns the policy set and approves each policy.',
          ...(links?.threads.meridianSecurity && threadSubject(links.threads.meridianSecurity)
            ? [
                `Meridian's security questionnaire came in the "${threadSubject(links.threads.meridianSecurity)}"`,
                'thread; their enterprise trial waits on it.',
              ]
            : []),
        ),
      ].join('\n\n'),
    context: (team, links) => [
      team.people.anika,
      ...(links ? [links.orgs.meridian, links.people.aisha, links.mailbox] : []),
    ],
  },
  offsite: {
    description: 'Three days at Saltmarsh Lodge for all ten of us: the 2027 roadmap and how we work.',
    repo: 'handbook',
    artifacts: ['offsiteAgenda'],
    instructions: () =>
      paragraph(
        'This project plans the Q4 offsite at Saltmarsh Lodge: three days, all ten of us. Astrid owns the agenda and',
        'Lucía books travel. Keep every cost in "Offsite agenda" and no decision anywhere else.',
      ),
    context: (team, links) => [team.people.astrid, ...(links ? [links.orgs.saltmarsh, links.people.wren] : [])],
  },
};

export type ProjectsInput = {
  readonly team: TeamProvides;
  readonly taskSets: Record<ProjectKey, TaskSet.TaskSet>;
  readonly artifacts: Artifacts;
  readonly inboxCrm?: InboxCrmLinks;
};

/** The four projects, each owning its instructions and task set and naming its repository. */
export const makeProjects = ({ team, taskSets, artifacts, inboxCrm }: ProjectsInput) =>
  Effect.gen(function* () {
    const repos = yield* SampleSpace.seed(REPO_SEEDS, (seed) =>
      Database.add(
        Repo.make({
          name: seed.name,
          owner: 'alien-labs',
          url: `https://github.com/alien-labs/${seed.name}`,
          description: seed.description,
          defaultBranch: 'main',
          organization: Ref.make(team.orgs.fieldstone),
        }),
      ),
    );

    const entries: Array<[ProjectKey, Project.Project]> = [];
    for (const [key, seed] of Object.entries(PROJECT_SEEDS) as Array<[ProjectKey, ProjectSeed]>) {
      const repo = repos[seed.repo];
      const project = Project.make({
        name: PROJECT_NAMES[key],
        description: seed.description,
        status: 'active',
        taskSet: Ref.make(taskSets[key]),
        repo: Ref.make(repo),
        repositories: [Ref.make(repo)],
        artifacts: seed.artifacts.map((artifact) => Ref.make(artifacts[artifact])),
      });
      const instructions = Instructions.make({
        name: 'Instructions',
        text: seed.instructions(inboxCrm),
        skills: skillRefs([...BASE_SKILLS, ...(inboxCrm ? [INBOX_SKILL] : [])]),
        objects: seed.context(team, inboxCrm).map((object) => Ref.make(object)),
      });
      // Ref before parent edge: the ref is what declares the edge (see `Obj.isDeclaredParentEdge`).
      Obj.update(project, (project) => {
        project.instructions = Ref.make(instructions);
      });
      Obj.setParent(instructions, project);
      entries.push([key, yield* Database.add(project)]);
    }

    return Object.fromEntries(entries) as Record<ProjectKey, Project.Project>;
  });
