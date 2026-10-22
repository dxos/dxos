// The provocation library (IDs match the tracker sheet and the creative platform doc).
// Each entry in `lines` appears on its own line, built word by word.
// Add a spot by adding an entry here; it shows up in Studio and in `npm run render`.

//
// Copyright 2026 DXOS.org
//

export type Provocation = {
  id: string;
  pillar: 'Sovereign Intelligence' | 'Private' | 'Decentralized' | 'Open source';
  lines: string[];
  resolve: string;
  turn?: string[]; // 30s only; defaults to DEFAULT_TURN in brand.ts
  firstRun: boolean;
};

export const PROVOCATIONS: Provocation[] = [
  {
    id: 'P01',
    pillar: 'Sovereign Intelligence',
    lines: ["You wouldn't rent your brain.", "Why rent your company's?"],
    resolve: 'Own your intelligence.',
    firstRun: true,
  },
  {
    id: 'P02',
    pillar: 'Sovereign Intelligence',
    lines: ['Who owns the memory', 'of your business?'],
    resolve: 'You should.',
    turn: ['Every conversation.', 'Every workflow.', 'Everything your agents have learned.'],
    firstRun: true,
  },
  {
    id: 'P03',
    pillar: 'Sovereign Intelligence',
    lines: ['Your agents work for you.', "So why do they live on someone else's servers?"],
    resolve: 'Bring them home.',
    firstRun: true,
  },
  {
    id: 'P04',
    pillar: 'Private',
    lines: ['Every prompt you send', 'leaves the building.'],
    resolve: 'Keep it in.',
    firstRun: false,
  },
  {
    id: 'P05',
    pillar: 'Private',
    lines: ['Private by policy', 'is not private.'],
    resolve: 'Private by design.',
    firstRun: true,
  },
  {
    id: 'P06',
    pillar: 'Private',
    lines: ['Who else can read', "your agents' memory?"],
    resolve: "No one you didn't choose.",
    firstRun: false,
  },
  {
    id: 'P07',
    pillar: 'Decentralized',
    lines: ['What happens to your company', 'when the API changes?'],
    resolve: 'Nothing. If you own it.',
    firstRun: true,
  },
  {
    id: 'P08',
    pillar: 'Decentralized',
    lines: ['One outage away from zero.'],
    resolve: 'Run anywhere. Keep running.',
    firstRun: false,
  },
  {
    id: 'P09',
    pillar: 'Decentralized',
    lines: ['Platform risk is the new', 'technical debt.'],
    resolve: 'Pay it down.',
    firstRun: false,
  },
  {
    id: 'P10',
    pillar: 'Decentralized',
    lines: ["The cloud is someone else's computer.", "Is your AI someone else's mind?"],
    resolve: 'Make it yours.',
    firstRun: false,
  },
  {
    id: 'P11',
    pillar: 'Open source',
    lines: ["If you can't fork it,", "you don't own it."],
    resolve: 'Fork everything.',
    firstRun: true,
  },
  {
    id: 'P12',
    pillar: 'Open source',
    lines: ['Terms of service', 'are not a strategy.'],
    resolve: 'Code is.',
    firstRun: true,
  },
  {
    id: 'P13',
    pillar: 'Open source',
    lines: ['Closed source.', 'Closed future.'],
    resolve: 'Open.',
    firstRun: false,
  },
  {
    id: 'P14',
    pillar: 'Open source',
    lines: ['Read the code,', 'not the press release.'],
    resolve: "It's all on GitHub.",
    firstRun: false,
  },
];
