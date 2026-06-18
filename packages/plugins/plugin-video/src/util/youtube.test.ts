//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import {
  type CaptionTrack,
  extractVideoId,
  formatTranscriptMarkdown,
  parseCaptionTracks,
  parseTimedText,
  parseYouTubeDescription,
  selectCaptionTrack,
} from './youtube';

describe('parseYouTubeDescription', () => {
  test('extracts the full shortDescription from ytInitialPlayerResponse', ({ expect }) => {
    const description = 'Line one.\nLine two with a } brace and a "quote".\nLine three.';
    const html = `<html><script>var ytInitialPlayerResponse = {"videoDetails":{"shortDescription":${JSON.stringify(
      description,
    )}}};</script></html>`;
    expect(parseYouTubeDescription(html)).toBe(description);
  });

  test('falls back to the microformat description', ({ expect }) => {
    const description = 'Microformat description.';
    const html = `<script>ytInitialPlayerResponse = {"microformat":{"playerMicroformatRenderer":{"description":{"simpleText":${JSON.stringify(
      description,
    )}}}}};</script>`;
    expect(parseYouTubeDescription(html)).toBe(description);
  });

  test('falls back to the og:description meta tag', ({ expect }) => {
    const html = '<head><meta property="og:description" content="A &amp; B short description"></head>';
    expect(parseYouTubeDescription(html)).toBe('A & B short description');
  });

  test('returns undefined when no description is present', ({ expect }) => {
    expect(parseYouTubeDescription('<html><body>nothing here</body></html>')).toBeUndefined();
  });
});

describe('extractVideoId', () => {
  test('parses watch, short, embed, and youtu.be URLs', ({ expect }) => {
    expect(extractVideoId('https://www.youtube.com/watch?v=aircAruvnKk&t=10s')).toBe('aircAruvnKk');
    expect(extractVideoId('https://youtu.be/aircAruvnKk?t=10')).toBe('aircAruvnKk');
    expect(extractVideoId('https://www.youtube.com/shorts/aircAruvnKk')).toBe('aircAruvnKk');
    expect(extractVideoId('https://www.youtube.com/embed/aircAruvnKk')).toBe('aircAruvnKk');
  });

  test('returns undefined for non-YouTube or unparseable URLs', ({ expect }) => {
    expect(extractVideoId('https://vimeo.com/12345')).toBeUndefined();
    expect(extractVideoId('not a url')).toBeUndefined();
  });
});

describe('parseCaptionTracks', () => {
  test('extracts caption tracks from a player response object', ({ expect }) => {
    const player = {
      captions: {
        playerCaptionsTracklistRenderer: {
          captionTracks: [
            { baseUrl: 'https://yt/api/timedtext?lang=en', languageCode: 'en', name: { simpleText: 'English' } },
            {
              baseUrl: 'https://yt/api/timedtext?lang=en&kind=asr',
              languageCode: 'en',
              kind: 'asr',
              name: { runs: [{ text: 'English (auto-generated)' }] },
            },
          ],
        },
      },
    };
    expect(parseCaptionTracks(player)).toEqual([
      { baseUrl: 'https://yt/api/timedtext?lang=en', languageCode: 'en', kind: undefined, name: 'English' },
      {
        baseUrl: 'https://yt/api/timedtext?lang=en&kind=asr',
        languageCode: 'en',
        kind: 'asr',
        name: 'English (auto-generated)',
      },
    ]);
  });

  test('returns empty array when no captions are present', ({ expect }) => {
    expect(parseCaptionTracks({ videoDetails: {} })).toEqual([]);
    expect(parseCaptionTracks(undefined)).toEqual([]);
  });
});

describe('selectCaptionTrack', () => {
  const manualEn: CaptionTrack = { baseUrl: 'm-en', languageCode: 'en' };
  const asrEn: CaptionTrack = { baseUrl: 'a-en', languageCode: 'en', kind: 'asr' };
  const manualFr: CaptionTrack = { baseUrl: 'm-fr', languageCode: 'fr' };

  test('prefers a human-authored track in the requested language', ({ expect }) => {
    expect(selectCaptionTrack([asrEn, manualEn], 'en')).toBe(manualEn);
  });

  test('matches the primary subtag (en against en-US)', ({ expect }) => {
    const usEn: CaptionTrack = { baseUrl: 'm-en-us', languageCode: 'en-US' };
    expect(selectCaptionTrack([manualFr, usEn], 'en')).toBe(usEn);
  });

  test('matches the primary subtag both ways (en-US request against an en track)', ({ expect }) => {
    expect(selectCaptionTrack([manualFr, manualEn], 'en-US')).toBe(manualEn);
  });

  test('falls back to an auto-generated track when no manual match exists', ({ expect }) => {
    expect(selectCaptionTrack([manualFr, asrEn], 'en')).toBe(asrEn);
  });

  test('falls back to the first track when nothing matches', ({ expect }) => {
    expect(selectCaptionTrack([manualFr], 'de')).toBe(manualFr);
  });

  test('returns undefined for an empty track list', ({ expect }) => {
    expect(selectCaptionTrack([], 'en')).toBeUndefined();
  });
});

describe('parseTimedText', () => {
  test('parses timed-text cues and decodes entities', ({ expect }) => {
    const xml =
      '<?xml version="1.0" encoding="utf-8"?><transcript>' +
      '<text start="0" dur="1.5">Hello &amp; welcome</text>' +
      '<text start="2.75" dur="2">it&#39;s great</text>' +
      '<text start="5"></text>' +
      '</transcript>';
    expect(parseTimedText(xml)).toEqual([
      { start: 0, text: 'Hello & welcome' },
      { start: 2.75, text: "it's great" },
    ]);
  });

  test('parses InnerTube format-3 <p t d> cues (milliseconds, with <s> word spans)', ({ expect }) => {
    const xml =
      '<?xml version="1.0" encoding="utf-8" ?><timedtext format="3"><body>' +
      '<p t="4220" d="1180">This is a 3.</p>' +
      '<p t="6060" d="2000"><s>blue</s><s> one</s></p>' +
      '<p t="9000" d="500"></p>' +
      '</body></timedtext>';
    expect(parseTimedText(xml)).toEqual([
      { start: 4.22, text: 'This is a 3.' },
      { start: 6.06, text: 'blue one' },
    ]);
  });

  test('returns empty array for empty XML', ({ expect }) => {
    expect(parseTimedText('<transcript></transcript>')).toEqual([]);
  });
});

describe('formatTranscriptMarkdown', () => {
  test('formats segments as timestamp-link lines', ({ expect }) => {
    const url = 'https://www.youtube.com/watch?v=abc';
    const content = formatTranscriptMarkdown(
      [
        { start: 0, text: 'First line.' },
        { start: 75, text: 'Second line.' },
        { start: 3661, text: 'After an hour.' },
      ],
      url,
    );
    expect(content).toBe(
      [
        '[0:00](https://www.youtube.com/watch?v=abc&t=0s) First line.',
        '[1:15](https://www.youtube.com/watch?v=abc&t=75s) Second line.',
        '[1:01:01](https://www.youtube.com/watch?v=abc&t=3661s) After an hour.',
      ].join('\n'),
    );
  });

  test('uses ? when the url has no query string', ({ expect }) => {
    expect(formatTranscriptMarkdown([{ start: 5, text: 'Hi.' }], 'https://youtu.be/abc')).toBe(
      '[0:05](https://youtu.be/abc?t=5s) Hi.',
    );
  });
});
