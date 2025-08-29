//
// Copyright 2025 DXOS.org
//

import { Obj } from '@dxos/echo';
import { DataType } from '@dxos/schema';

export const testTranscriptMessages = (): DataType.Message[] => {
  const timeInterval = 1000;
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
export const testMailboxMessages = (): DataType.Message[] => {
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
