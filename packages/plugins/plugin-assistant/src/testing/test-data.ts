//
// Copyright 2025 DXOS.org
//

import { type Live, type Space } from '@dxos/client/echo';
import { Obj, Relation, type Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { DataType } from '@dxos/schema';

// import { faker } from '@dxos/random';
// import { DataType } from '@dxos/schema';
// import { type ValueGenerator, createGenerator } from '@dxos/schema/testing';
// faker.seed(1);
// const generator = faker as any as ValueGenerator;
// const objectGenerator = createGenerator(generator, DataType.Organization, { force: true });

export const testTypes: Type.Obj.Any[] = [
  DataType.Organization,
  DataType.Person,
  DataType.Employer,
  DataType.HasConnection,
];

const organizations: (Type.Properties<DataType.Organization> & { id: string })[] = [
  { id: 'dxos', name: 'DXOS', website: 'https://dxos.org' },
  { id: 'socket_supply', name: 'Socket Supply', website: 'https://socketsupply.com' },
  { id: 'ink_and_switch', name: 'Ink & Switch', website: 'https://inkandswitch.com' },
  { id: 'effectful', name: 'Effectful', website: 'https://effect.co' },
  { id: 'blueyard', name: 'Blue Yard', website: 'https://blueyard.com' },
  { id: 'backed', name: 'Backed', website: 'https://backed.vc' },
  { id: 'protocol_labs', name: 'Protocol Labs', website: 'https://protocol.ai' },
  { id: 'newlab', name: 'Newlab', website: 'https://newlab.com' },
  { id: 'google', name: 'Google', website: 'https://google.com' },
  { id: 'microsoft', name: 'Microsoft', website: 'https://microsoft.com' },
  { id: 'openai', name: 'OpenAI', website: 'https://openai.com' },
  { id: 'anthropic', name: 'Anthropic', website: 'https://anthropic.com' },
  { id: 'amazon', name: 'Amazon', website: 'https://amazon.com' },
  { id: 'deshaw', name: 'D. E. Shaw & Co.', website: 'https://deshaw.com' },
];

const people: (Type.Properties<DataType.Person> & { id: string })[] = [
  { id: 'rich_burdon', fullName: 'Rich Burdon' },
  { id: 'josiah_witt', fullName: 'Josiah Witt' },
  { id: 'dima_dmaretskyi', fullName: 'Dima Maretskyi' },
  { id: 'chad_fowler', fullName: 'Chad Fowler' },
  { id: 'ciaran_oleary', fullName: "Ciarán O'Leary" },
  { id: 'jason_whitmire', fullName: 'Jason Whitmire' },
  { id: 'alex_brunicki', fullName: 'Alex Brunicki' },
  { id: 'andre_de_haes', fullName: 'Andre de Haes' },
  { id: 'scott_cohen', fullName: 'Scott Cohen' },
  { id: 'juan_benet', fullName: 'Juan Benet' },
  { id: 'satya_nadella', fullName: 'Satya Nadella' },
  { id: 'kevin_scott', fullName: 'Kevin Scott' },
  { id: 'jeff_bezos', fullName: 'Jeff Bezos' },
];

const testObjects: Record<string, any[]> = {
  [DataType.Organization.typename]: organizations,
  [DataType.Person.typename]: people,
};

const testRelationships: Record<
  string,
  ({
    source: string;
    target: string;
  } & Record<string, any>)[]
> = {
  [DataType.Employer.typename]: [
    // prettier-ignore
    { source: 'rich_burdon', target: 'dxos' },
    { source: 'rich_burdon', target: 'google', active: false }, // TODO(burdon): Should not contribute to force.
    { source: 'rich_burdon', target: 'deshaw', active: false },
    { source: 'josiah_witt', target: 'dxos' },
    { source: 'dima_dmaretskyi', target: 'dxos' },
    { source: 'chad_fowler', target: 'blueyard' },
    { source: 'chad_fowler', target: 'microsoft', active: false },
    { source: 'ciaran_oleary', target: 'blueyard' },
    { source: 'jason_whitmire', target: 'blueyard' },
    { source: 'juan_benet', target: 'protocol_labs' },
    { source: 'alex_brunicki', target: 'backed' },
    { source: 'andre_de_haes', target: 'backed' },
    { source: 'scott_cohen', target: 'newlab' },
    { source: 'satya_nadella', target: 'microsoft' },
    { source: 'kevin_scott', target: 'microsoft' },
    { source: 'kevin_scott', target: 'google', active: false },
    { source: 'jeff_bezos', target: 'amazon' },
    { source: 'jeff_bezos', target: 'deshaw', active: false },
  ],

  // TODO(burdon): Limit graph view to selected relationship types.
  [DataType.HasConnection.typename]: [
    // prettier-ignore
    { kind: 'partner', source: 'dxos', target: 'ink_and_switch' },
    { kind: 'partner', source: 'dxos', target: 'effectful' },
    { kind: 'partner', source: 'dxos', target: 'socket_supply' },

    // prettier-ignore
    { kind: 'investor', source: 'blueyard', target: 'dxos' },
    { kind: 'investor', source: 'blueyard', target: 'protocol_labs' },
    { kind: 'investor', source: 'protocol_labs', target: 'dxos' },
    { kind: 'investor', source: 'backed', target: 'dxos' },
    { kind: 'investor', source: 'newlab', target: 'dxos' },
    { kind: 'investor', source: 'microsoft', target: 'openai' },
    { kind: 'investor', source: 'google', target: 'anthropic' },
    { kind: 'investor', source: 'amazon', target: 'anthropic' },
  ],
};

export const addTestData = async (space: Space): Promise<void> => {
  const objectMap = new Map<string, Live<any>>();

  for (const [typename, objects] of Object.entries(testObjects)) {
    const schema = space.db.graph.schemaRegistry.getSchema(typename);
    invariant(schema, `Schema not found: ${typename}`);
    for (const { id, ...data } of objects) {
      const object = space.db.add(Obj.make(schema, data));
      objectMap.set(id, object);
    }
  }

  for (const [typename, relationships] of Object.entries(testRelationships)) {
    const schema = space.db.graph.schemaRegistry.getSchema(typename);
    invariant(schema, `Schema not found: ${typename}`);

    for (const { source, target, ...data } of relationships) {
      const sourceObject = objectMap.get(source);
      const targetObject = objectMap.get(target);
      invariant(sourceObject, `Source object not found: ${source}`);
      invariant(targetObject, `Target object not found: ${target}`);

      space.db.add(
        Relation.make(schema, {
          // TODO(burdon): Test source/target types match.
          [Relation.Source]: sourceObject,
          [Relation.Target]: targetObject,
          ...data,
        }),
      );
    }
  }
};

export const createTestTranscription = (): DataType.Message[] => {
  const timeInterval = 1_000;
  const transcription: DataType.Message[] = [
    {
      text: 'Hey everyone, glad we could all connect today. I was thinking we could discuss where AI might be heading in the next decade.',
      sender: 'Mykola',
    },
    {
      text: 'Yeah, that sounds great. Personally, I think AI will get deeply integrated into daily life—like assistants that don’t just answer questions but anticipate our needs.',
      sender: 'Rich',
    },
    {
      text: 'That’s true, but there are risks too. If AI predicts too much, we might lose the sense of making decisions ourselves.',
      sender: 'Dima',
    },
    {
      text: 'Good point. I think the balance will come from better human-AI collaboration rather than pure automation.',
      sender: 'Dima',
    },
    {
      text: 'Right, like AI as a co-pilot instead of a replacement. I see that happening a lot in creative fields already.',
      sender: 'Mykola',
    },
    {
      text: 'Exactly. And in science, too—AI models can suggest hypotheses humans wouldn’t think of, speeding up discoveries.',
      sender: 'Rich',
    },
    {
      text: 'So it looks like the future is less about AI replacing us, and more about AI amplifying what humans can do.',
      sender: 'Dima',
    },
    {
      text: 'I think we should research alignment of AI with human values.',
      sender: 'Mykola',
    },
    {
      text: 'I agree. We should also research the risks of AI generating content and polluting knowledge bases.',
      sender: 'Rich',
    },
  ].map((message, index, array) => {
    const created = new Date(Date.now() - (array.length - index) * timeInterval);
    return Obj.make(DataType.Message, {
      created: created.toISOString(),
      blocks: [{ _tag: 'transcript', started: created.toISOString(), text: message.text }],
      sender: { identityDid: message.sender },
    });
  });

  return transcription;
};

// TODO(wittjosiah): Find way to use data generator to generate substantive messages that could be summarized.
export const createTestMailbox = (): DataType.Message[] => {
  const timeInterval = 1000;
  const messages: DataType.Message[] = [
    {
      text: 'Subject: Project Kickoff\n\nHi team,\n\nWe are excited to announce the kickoff of the Apollo project. Please review the attached roadmap and be prepared for our first meeting on Monday.\n\nBest,\nAlice',
      sender: 'alice.johnson@acme-corp.com',
    },
    {
      text: 'Subject: Sales Update\n\nDear all,\n\nQ2 sales numbers have exceeded expectations. Congratulations to everyone for their hard work!\n\nRegards,\nBob',
      sender: 'bob.smith@salesforce.biz',
    },
    {
      text: 'Subject: Invoice Reminder\n\nHello,\n\nThis is a friendly reminder that invoice #12345 is due next week. Please let us know if you have any questions.\n\nThank you,\nCarol',
      sender: 'carol.finance@invoicesolutions.com',
    },
    {
      text: 'Subject: Meeting Rescheduled\n\nHi team,\n\nTomorrow’s product design meeting has been moved to Friday at 2pm. Please update your calendars.\n\nThanks,\nDavid',
      sender: 'david.lee@productdesign.io',
    },
    {
      text: 'Subject: Welcome Aboard!\n\nWelcome to the company, Emily! We are thrilled to have you join the marketing department.\n\nBest,\nFiona',
      sender: 'fiona.hr@enterpriseco.com',
    },
    {
      text: 'Subject: IT Maintenance\n\nDear colleagues,\n\nScheduled IT maintenance will occur this Saturday from 1am to 5am. Please save your work accordingly.\n\nSincerely,\nGreg',
      sender: 'greg.it@supporthub.net',
    },
    {
      text: 'Subject: Lunch & Learn\n\nJoin us for a Lunch & Learn session on cloud security this Thursday in the main conference room.\n\nSee you there,\nHelen',
      sender: 'helen.training@acme-corp.com',
    },
    {
      text: 'Subject: Client Feedback\n\nHi,\n\nOur client, InnovateX, sent positive feedback on the recent deployment. Great job, everyone!\n\nCheers,\nIvan',
      sender: 'ivan.account@consultingpartners.org',
    },
    {
      text: 'Subject: Policy Update\n\nPlease review the updated remote work policy attached to this email. Let us know if you have any questions.\n\nBest regards,\nJulia',
      sender: 'julia.admin@acme-corp.com',
    },
  ].map((message, index, array) => {
    const created = new Date(Date.now() - (array.length - index) * timeInterval);
    return Obj.make(DataType.Message, {
      created: created.toISOString(),
      blocks: [{ _tag: 'text', text: message.text }],
      sender: { email: message.sender },
    });
  });

  return messages;
};
