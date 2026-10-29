//
// Copyright 2026 DXOS.org
//

import type * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { invariant } from '@dxos/invariant';

export type FeedKey = 'orbit' | 'trail' | 'bench';

export type FeedSeed = SampleSpace.Seed<
  FeedKey,
  {
    readonly name: string;
    readonly url: string;
    readonly description: string;
  }
>;

export type PostSeed = SampleSpace.Seed<
  string,
  {
    readonly feed: FeedKey;
    readonly title: string;
    readonly author: string;
    /** Days before the reference date, and the UTC hour, the post was published. */
    readonly published: readonly [days: number, hours: number];
    /** Unsplash photo id of the hero image. */
    readonly photo: string;
    /** One-sentence summary: the feed's description field. */
    readonly summary: string;
    /** The article body after the summary, one paragraph per entry. */
    readonly body: readonly string[];
  }
>;

/** Hero image URL; Unsplash serves a resized, cropped JPEG for any photo id. */
export const imageUrl = (photo: string): string =>
  `https://images.unsplash.com/photo-${photo}?w=1200&q=80&auto=format&fit=crop`;

export const FEEDS: readonly FeedSeed[] = [
  {
    key: 'orbit',
    name: 'Orbit Weekly',
    url: 'https://orbitweekly.example/feed.xml',
    description: 'Launches, telescopes and the night sky.',
  },
  {
    key: 'trail',
    name: 'Trail & Tide',
    url: 'https://trailandtide.example/rss',
    description: 'Walks, coastlines and slow travel.',
  },
  {
    key: 'bench',
    name: 'The Workbench',
    url: 'https://workbench.example/atom.xml',
    description: 'Notes on building software by hand.',
  },
];

export const POSTS: readonly PostSeed[] = [
  //
  // Orbit Weekly.
  //
  {
    key: 'heavy-lifters',
    feed: 'orbit',
    title: 'Three launches, one weekend: a field guide to the new heavy lifters',
    author: 'Mara Lindqvist',
    published: [1, 7],
    photo: '1457364559154-aa2644600ebb',
    summary: 'Reusable boosters have turned the launch calendar into a weekly event. Here is how to tell them apart.',
    body: [
      'Ten years ago a launch was a rare event that drew crowds to the causeway. Now there are weekends with three, and the boosters come home to land on their own legs.',
      'The trick to telling them apart is the plume: kerosene burns bright and sooty, methane burns clean and blue, and solid boosters leave a column of white smoke that hangs for an hour.',
    ],
  },
  {
    key: 'one-orbit',
    feed: 'orbit',
    title: 'What the station crew sees on a single orbit',
    author: 'Tomás Reyes',
    published: [1, 15],
    photo: '1446776811953-b23d57bd21aa',
    summary:
      'Ninety-two minutes, sixteen sunrises a day, and a coastline that slides past at eight kilometres a second.',
    body: [
      'An orbit of the station takes about ninety-two minutes, so the crew sees a sunrise or a sunset every forty-five. Most of them stop noticing by the second week.',
      'What they keep noticing is the weather: storm fronts drawn in white across the ocean, and the thin blue line of the atmosphere along the horizon.',
    ],
  },
  {
    key: 'bubble',
    feed: 'orbit',
    title: 'A bubble seven light-years across, and what blew it',
    author: 'Ines Okafor',
    published: [2, 10],
    photo: '1462331940025-496dfbfc7564',
    summary:
      'A single massive star is inflating a shell of gas with its stellar wind, and the new images show the seams.',
    body: [
      'The star at its centre is forty times the mass of the Sun and burns so fiercely that its wind pushes the surrounding gas outward at millions of kilometres an hour.',
      'Where the shell meets a denser cloud it slows and glows, which is why one side of the bubble looks brighter than the other.',
    ],
  },
  {
    key: 'night-side',
    feed: 'orbit',
    title: 'The night side: city lights as a census',
    author: 'Mara Lindqvist',
    published: [3, 20],
    photo: '1451187580459-43490279c0fa',
    summary: 'Economists are using night-time satellite images to measure growth where the statistics are thin.',
    body: [
      'Lights at night track electricity use, and electricity use tracks economic activity. The correlation is rough, but it is available everywhere and updated every night.',
      'The method has limits: a city that switches to efficient street lamps looks like it is shrinking.',
    ],
  },
  {
    key: 'cupola',
    feed: 'orbit',
    title: 'Inside the cupola: seven windows on the world',
    author: 'Tomás Reyes',
    published: [5, 12],
    photo: '1446776877081-d282a0f896e2',
    summary: "The station's observation module was an afterthought. It became the most photographed room in orbit.",
    body: [
      'The cupola was built to give the crew a view of the robotic arm. Within a month it was where everyone went to call home.',
      'Its seven windows have shutters to protect them from micrometeorites, and the crew close them every night.',
    ],
  },
  {
    key: 'meteors',
    feed: 'orbit',
    title: 'How to photograph a meteor shower with a phone',
    author: 'Ines Okafor',
    published: [6, 21],
    photo: '1419242902214-272b3f66ee7a',
    summary: 'A tripod, a long exposure and patience will do more than an expensive lens.',
    body: [
      'Set the phone on a tripod, point it a third of the way up the sky away from the radiant, and use the longest night-mode exposure it allows.',
      'Then take a hundred frames. Most will be empty; the two that are not will be worth the cold.',
    ],
  },
  {
    key: 'dark-sky',
    feed: 'orbit',
    title: 'Dark-sky parks worth the drive this autumn',
    author: 'Mara Lindqvist',
    published: [8, 9],
    photo: '1519681393784-d120267933ba',
    summary: 'Five places where the Milky Way still casts a shadow, and how to time your visit to the new moon.',
    body: [
      'A dark-sky park is certified for how little artificial light reaches it. At the best of them you can see your shadow by starlight alone.',
      'Go in the week around the new moon, give your eyes twenty minutes to adjust, and leave the phone in your pocket.',
    ],
  },
  {
    key: 'galactic-core',
    feed: 'orbit',
    title: 'Finding the galactic core without a star chart',
    author: 'Ines Okafor',
    published: [9, 22],
    photo: '1503264116251-35a269479413',
    summary: 'Follow the teapot in Sagittarius: the steam rising from its spout is the centre of the galaxy.',
    body: [
      'In the southern summer sky, look for eight stars in the shape of a teapot. The bright haze above its spout is the densest part of the Milky Way.',
      'Behind the dust lanes, twenty-six thousand light-years away, is the black hole at the centre of the galaxy.',
    ],
  },
  {
    key: 'celestial-navigation',
    feed: 'orbit',
    title: 'Celestial navigation is back in sailing schools',
    author: 'Tomás Reyes',
    published: [11, 18],
    photo: '1534447677768-be436bb09401',
    summary: 'GPS jamming has made the sextant a safety tool again, and instructors cannot keep up with demand.',
    body: [
      'A sextant measures the angle between a star and the horizon. With an accurate clock and a table of star positions, that angle gives a line of position.',
      'Three stars give three lines, and where they cross is the boat. The method has not changed in two hundred years.',
    ],
  },
  {
    key: 'orion',
    feed: 'orbit',
    title: "Orion's nursery, imaged from a backyard",
    author: 'Ines Okafor',
    published: [13, 11],
    photo: '1516339901601-2e1b62dc0c45',
    summary: 'Forty hours of exposures from a suburban garden reveal the stars forming inside the nebula.',
    body: [
      "The Orion nebula is visible to the naked eye as a fuzzy star in the hunter's sword. With a small telescope and a lot of patience, it opens into folds of glowing gas.",
      'The four bright stars at its heart, the Trapezium, light the whole cloud.',
    ],
  },

  //
  // Trail & Tide.
  //
  {
    key: 'braies',
    feed: 'trail',
    title: 'Lago di Braies before the crowds arrive',
    author: 'Lena Brandt',
    published: [1, 11],
    photo: '1501785888041-af3ef285b470',
    summary: 'Arrive at first light and the lake is yours: the boats are still tied up and the water is glass.',
    body: [
      'By ten in the morning the car park is full and the shoreline path is single file. At six there are a few photographers and a heron.',
      'The loop around the lake takes an hour; the climb to the hut above it takes three and is worth every step.',
    ],
  },
  {
    key: 'valley-mornings',
    feed: 'trail',
    title: 'Valley mornings: a slow week in the Sierra',
    author: 'Sam Achebe',
    published: [1, 8],
    photo: '1506744038136-46273834b3fb',
    summary: 'Skip the summit checklist. Stay in one valley for a week and let the light do the work.',
    body: [
      'We stayed at one campsite for seven nights and walked a different trail from it every day. By the end we knew which rock caught the first sun.',
      'The rivers are low in autumn, which makes the crossings easy and the reflections still.',
    ],
  },
  {
    key: 'canyon-road',
    feed: 'trail',
    title: 'The long road to the canyon country',
    author: 'Lena Brandt',
    published: [2, 16],
    photo: '1500530855697-b586d89ba3ee',
    summary: 'Four hundred kilometres of red rock, two gas stations and no signal: plan the drive like a hike.',
    body: [
      'Carry twice the water you think you need, and a paper map. The signal drops out an hour after the last town and does not come back.',
      'Stop often. The canyons are best seen from the pull-outs, not the windscreen.',
    ],
  },
  {
    key: 'forest-bathing',
    feed: 'trail',
    title: 'Forest bathing, measured: what a walk in the woods does',
    author: 'Sam Achebe',
    published: [4, 9],
    photo: '1441974231531-c6227db76b6e',
    summary: 'New studies put numbers on the calm: lower heart rates and better sleep after two hours under trees.',
    body: [
      'The effect is not about exercise. Participants who sat still in a forest showed the same changes as those who walked.',
      'Researchers think the quiet matters as much as the trees, which is good news for anyone with a park nearby.',
    ],
  },
  {
    key: 'sea-cliffs',
    feed: 'trail',
    title: 'Sea cliffs and sunrise on the north coast',
    author: 'Lena Brandt',
    published: [5, 6],
    photo: '1470071459604-3b5ec3a7fe05',
    summary: 'The coast path is at its best at dawn, when the mist lifts off the headlands one by one.',
    body: [
      'Start from the harbour in the dark with a head torch. By the time you reach the second headland the sky is pink and the gulls are up.',
      'The path is narrow in places; stay back from the edge, where the turf overhangs the rock.',
    ],
  },
  {
    key: 'off-season',
    feed: 'trail',
    title: 'Off-season beaches are the best beaches',
    author: 'Sam Achebe',
    published: [7, 17],
    photo: '1507525428034-b723cf961d3e',
    summary: 'The water is still warm in October, the cafés are half price and the sand is empty.',
    body: [
      'Seas hold their heat long after the air cools, so the swimming is often better in autumn than in June.',
      'Bring a jumper for the evening, and check which cafés close for the winter before you go.',
    ],
  },
  {
    key: 'glacial-lakes',
    feed: 'trail',
    title: 'Glacial lakes and why they are that blue',
    author: 'Lena Brandt',
    published: [8, 13],
    photo: '1493246507139-91e8fad9978e',
    summary: 'Rock flour ground by the ice hangs in the water and scatters blue light back to the surface.',
    body: [
      'The colour changes through the season: milky in spring when the melt is strongest, turquoise in late summer when the flour settles.',
      'The same particles make the water too cold and cloudy for most fish, so the lakes are quiet as well as blue.',
    ],
  },
  {
    key: 'autumn-colour',
    feed: 'trail',
    title: 'Where to find the earliest autumn colour',
    author: 'Sam Achebe',
    published: [10, 10],
    photo: '1523712999610-f77fbcfc3843',
    summary: 'Cold nights start the change, so go high and north first and follow the colour down the valleys.',
    body: [
      'Leaves turn when the nights get cold and the days get short. The first trees to change are on north-facing slopes at altitude.',
      'A week later the colour reaches the valley floor, which gives you a second chance if you miss the first.',
    ],
  },
  {
    key: 'waterfalls',
    feed: 'trail',
    title: 'Five waterfalls you can reach on a day hike',
    author: 'Lena Brandt',
    published: [12, 9],
    photo: '1433086966358-54859d0ed716',
    summary: 'From a ten-minute stroll to a full-day climb, each with a footbridge and a place to sit.',
    body: [
      'Waterfalls are best after a few days of rain and before the leaves fall, when the spray is loud and the rocks are green.',
      'Wear shoes with grip: the paths near the falls are always wet.',
    ],
  },
  {
    key: 'rainforest-rivers',
    feed: 'trail',
    title: 'Rain-forest rivers after the first storms',
    author: 'Sam Achebe',
    published: [13, 15],
    photo: '1511884642898-4c92249e20b6',
    summary: 'When the autumn rains return, the coastal rivers wake up and the salmon start to run.',
    body: [
      'The first big storm of the season raises the rivers overnight. A week later the salmon are in the shallows.',
      'Watch from the bank and keep your distance: the bears know the season as well as you do.',
    ],
  },

  //
  // The Workbench.
  //
  {
    key: 'single-purpose',
    feed: 'bench',
    title: 'Small tools, sharp edges: a case for single-purpose apps',
    author: 'Priya Natarajan',
    published: [1, 14],
    photo: '1517694712202-14dd9538aa97',
    summary: 'The apps people keep for a decade do one thing well. Most of them are under ten thousand lines.',
    body: [
      'A tool that does one thing can be learned in an afternoon and trusted for years. A platform that does everything has to be relearned with every release.',
      'The best small tools also compose: their data is plain, so another tool can pick it up.',
    ],
  },
  {
    key: 'desk-setups',
    feed: 'bench',
    title: 'Desk setups of people who ship',
    author: 'Jonas Weber',
    published: [1, 12],
    photo: '1498050108023-c5249f4df085',
    summary: 'One screen, a notebook and a plant. The most productive desks we visited were the plainest.',
    body: [
      'We asked twenty engineers to photograph their desks before they tidied them. Most had one monitor, and half had a paper notebook open next to the keyboard.',
      'Nobody had a second keyboard. Several had a plant they admitted they forgot to water.',
    ],
  },
  {
    key: 'reading-code',
    feed: 'bench',
    title: 'Reading code out loud: the review habit that stuck',
    author: 'Priya Natarajan',
    published: [3, 15],
    photo: '1555066931-4365d14bab8c',
    summary: 'A team that reads each change aloud before merging found fewer bugs and shorter reviews.',
    body: [
      'Reading aloud forces you to say what the code does, not what you think it does. Most of the bugs were found in the gap between the two.',
      'The reviews got shorter because the author usually found the problem halfway through the sentence.',
    ],
  },
  {
    key: 'local-first',
    feed: 'bench',
    title: 'Why local-first software is having a moment',
    author: 'Jonas Weber',
    published: [4, 11],
    photo: '1518770660439-4636190af475',
    summary:
      'Your data on your device, synced when the network allows: the old idea that new sync engines made practical.',
    body: [
      'Local-first apps keep the primary copy of your data on your own device and treat the server as a peer. They open instantly and keep working on a plane.',
      'What changed is the sync: conflict-free data types make merging two offline edits a solved problem.',
    ],
  },
  {
    key: 'dark-mode',
    feed: 'bench',
    title: 'Dark mode is a design system, not a toggle',
    author: 'Priya Natarajan',
    published: [6, 14],
    photo: '1488590528505-98d2b5aba04b',
    summary: 'Inverting the colours is not enough. Shadows, elevation and contrast all need their own rules.',
    body: [
      'In a light theme, elevation is shown with shadows. In a dark theme shadows disappear, so raised surfaces get lighter instead.',
      'Start from tokens rather than colours, and the second theme is a new table of values, not a rewrite.',
    ],
  },
  {
    key: 'battery-life',
    feed: 'bench',
    title: 'The quiet laptop: building for battery life',
    author: 'Jonas Weber',
    published: [7, 10],
    photo: '1531297484001-80022131f5a1',
    summary: 'Every timer that wakes the CPU costs minutes of battery. A profiler shows where they hide.',
    body: [
      'An idle app should be idle. Polling loops, animations that never stop and logging in the background all keep the processor awake.',
      "Measure with the operating system's energy profiler, not a stopwatch, and fix the biggest wake-up first.",
    ],
  },
  {
    key: 'eight-bit',
    feed: 'bench',
    title: 'What 8-bit machines still teach about constraints',
    author: 'Priya Natarajan',
    published: [9, 16],
    photo: '1550745165-9bc0b252726f',
    summary: 'Sixty-four kilobytes forced programmers to decide what mattered. The habit is worth keeping.',
    body: [
      'On a machine with sixty-four kilobytes of memory, every feature had a visible cost. Programmers learned to say no early.',
      'Modern machines remove the limit but not the lesson: a smaller program is easier to understand, test and change.',
    ],
  },
  {
    key: 'sync-engines',
    feed: 'bench',
    title: 'Sync engines, explained without the jargon',
    author: 'Jonas Weber',
    published: [10, 13],
    photo: '1526374965328-7f61d4dc18c5',
    summary: 'Two people edit the same document offline. Here is how their changes meet without anyone losing work.',
    body: [
      "Each device records its edits as a list of small operations. When the devices reconnect they exchange the lists and apply each other's operations.",
      'The data type is designed so that the order of exchange does not matter: both devices end in the same state.',
    ],
  },
  {
    key: 'agents-ask',
    feed: 'bench',
    title: 'Agents that ask before they act',
    author: 'Priya Natarajan',
    published: [12, 15],
    photo: '1485827404703-89b55fcc595e',
    summary: 'The most useful assistants we tested paused for confirmation before every change they could not undo.',
    body: [
      'An agent that edits your documents should show you what it intends to change. One that sends email on your behalf should ask first, every time.',
      'Good defaults matter more than clever prompts: read freely, write carefully, and never delete without asking.',
    ],
  },
  {
    key: 'paper-first',
    feed: 'bench',
    title: 'Paper first: why designers still sketch',
    author: 'Jonas Weber',
    published: [13, 9],
    photo: '1484480974693-6ca0a78fb36b',
    summary: 'A pencil is faster than any design tool for the first ten ideas, and it is easier to throw them away.',
    body: [
      'Sketches are cheap, so you make more of them, and you are less attached to each one. The good idea is usually the seventh.',
      'Move to the screen when the idea needs to be precise, not before.',
    ],
  },
];

export type MagazineSeed = {
  readonly name: string;
  /** Topic of the curation Routine. */
  readonly topic: string;
  /** Curated posts in display order, each with the agent-written snippet that replaces the feed summary. */
  readonly posts: ReadonlyArray<{ readonly key: string; readonly snippet: string }>;
};

/** The curated magazine: four posts from each feed, as one curation pass would leave them. */
export const MAGAZINE: MagazineSeed = {
  name: 'Weekend Reading',
  topic: 'Long reads on the outdoors, the night sky and well-made software. Prefer pieces with strong photography.',
  posts: [
    { key: 'braies', snippet: 'An alpine lake at first light, and the climb to the hut above it.' },
    { key: 'heavy-lifters', snippet: 'How to tell the new reusable rockets apart by their plumes.' },
    { key: 'local-first', snippet: 'Why keeping your data on your own device is practical again.' },
    { key: 'dark-sky', snippet: 'Five parks dark enough for the Milky Way to cast a shadow.' },
    { key: 'glacial-lakes', snippet: 'The physics behind the turquoise water of glacier-fed lakes.' },
    { key: 'eight-bit', snippet: 'What sixty-four kilobytes taught a generation of programmers.' },
    { key: 'bubble', snippet: 'A massive star blowing a bubble seven light-years wide.' },
    { key: 'autumn-colour', snippet: 'Where autumn colour starts, and how to follow it downhill.' },
    { key: 'sync-engines', snippet: 'Offline edits from two people, merged without losing work.' },
    { key: 'orion', snippet: 'A backyard telescope, forty hours of exposures, and a stellar nursery.' },
    { key: 'waterfalls', snippet: "Five waterfalls within a day's walk, from easy to steep." },
    { key: 'paper-first', snippet: 'The case for a pencil before the first pixel.' },
  ],
};

/** The seed row of a post, by key. */
export const postSeed = (key: string): PostSeed => {
  const seed = POSTS.find((post) => post.key === key);
  invariant(seed, `unknown post: ${key}`);
  return seed;
};

/** Origin of a feed's site, which its post links sit under. */
export const feedSite = (key: FeedKey): string => {
  const feed = FEEDS.find((feed) => feed.key === key);
  invariant(feed, `unknown feed: ${key}`);
  return new URL(feed.url).origin;
};

/** Posts the reader has opened; none is in the magazine, so its tiles all show at full strength. */
export const READ: readonly string[] = ['one-orbit', 'canyon-road', 'desk-setups'];

/** Posts the reader has starred. */
export const STARRED: readonly string[] = ['dark-sky', 'sync-engines'];
