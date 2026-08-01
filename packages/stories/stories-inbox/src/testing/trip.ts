//
// Copyright 2026 DXOS.org
//

//
// Two legs of ONE booking (same PNR), plus an unrelated message. The mocked LLM returns a payload
// based on the flight number found in the prompt (which includes the message body), so extracting
// both legs must produce ONE Trip with TWO Segments — exercising the real feed + ExtractMessage
// operation + ECHO space path, where messages are immutable Queue items (the composer setup).
//

const PNR = 'ABC123';

export const TRIP_LEGS = [
  {
    confirmationCode: PNR,
    segments: [
      {
        number: 'AF0001',
        origin: { code: 'JFK', name: 'New York' },
        destination: { code: 'CDG', name: 'Paris' },
        departAt: '2026-06-01T17:30:00.000Z',
        arriveAt: '2026-06-02T07:00:00.000Z',
      },
    ],
  },
  {
    confirmationCode: PNR,
    segments: [
      {
        number: 'AF0002',
        origin: { code: 'CDG', name: 'Paris' },
        destination: { code: 'LIS', name: 'Lisbon' },
        departAt: '2026-06-05T11:00:00.000Z',
        arriveAt: '2026-06-05T13:15:00.000Z',
      },
    ],
  },
];

export const TRIP_MESSAGES = [
  {
    from: 'no-reply@airfrance.com',
    subject: 'Flight confirmation AF0001',
    body: `Your booking ${PNR} is confirmed. Flight AF0001 from JFK to CDG.`,
  },
  {
    from: 'no-reply@airfrance.com',
    subject: 'Flight confirmation AF0002',
    body: `Your booking ${PNR} is confirmed. Flight AF0002 from CDG to LIS.`,
  },
  {
    from: 'news@example.com',
    subject: 'Weekly digest',
    body: 'Nothing to see here.',
  },
];
