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
    {},
  ].map((message, index, array) => {
    const created = new Date(Date.now() - (array.length - index) * timeInterval);
    return Obj.make(DataType.Message, {
      created: created.toISOString(),
      blocks: [{ _tag: 'transcript', started: created.toISOString(), text: message.text! }],
      sender: { identityDid: message.sender },
    });
  });

  return transcription;
};
