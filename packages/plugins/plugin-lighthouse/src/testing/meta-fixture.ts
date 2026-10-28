//
// Copyright 2026 DXOS.org
//

import { type Issue, type Plugin, type Predicate, type StorageReport } from '#client';

// Real answers from a lighthouse workspace's /v1/plugins, /predicates, /issues and /storage, trimmed.

export const pluginsFixture: Plugin[] = [
  {
    id: 'core.browsers',
    hosts: [],
    contributes: {
      access: 1,
      browsers: ['fetch'],
    },
    name: 'Browser engines',
    description: 'Plain fetch, and the default engine order a host without an access rule gets.',
    core: true,
  },
  {
    id: 'api.github.com',
    hosts: ['api.github.com'],
    contributes: {
      access: 2,
      searchEngines: ['github', 'github-user'],
      extractors: ['github.contributors', 'github.org', 'github.org-members', 'github.search', 'github.user-orgs'],
    },
    name: 'GitHub API',
    description: "GitHub's REST API, unauthenticated: repository search, contributors, organisations (JSON).",
  },
  {
    id: 'api.sejm.gov.pl',
    hosts: ['api.sejm.gov.pl'],
    contributes: {
      access: 1,
      searchEngines: ['sejm-acts', 'sejm-processes'],
      services: ['eli-text', 'eli-references'],
      extractors: ['sejm.acts', 'sejm.processes', 'sejm.text'],
    },
    name: 'Sejm API (ELI and legislative process)',
    description:
      "The Polish Sejm's open JSON API: ELI (every act published in Dziennik Ustaw and Monitor Polski since 1918, with status, dates, issuing body, keywords and the relations between acts — amendments, consolidated texts, repeals, legal basis) and the Sejm's legislative processes (bills with their stages and votes).",
  },
  {
    id: 'duckduckgo.com',
    hosts: ['duckduckgo.com', 'html.duckduckgo.com', 'lite.duckduckgo.com'],
    contributes: {
      access: 1,
      searchEngines: ['duckduckgo', 'duckduckgo-images'],
      extractors: ['duckduckgo.images', 'duckduckgo.images-token', 'duckduckgo.serp'],
    },
    name: 'DuckDuckGo',
    description: "Web search through DuckDuckGo's script-free HTML endpoint (Bing-backed index). Plain fetch works.",
  },
  {
    id: 'www.google.com',
    hosts: ['www.google.com', 'google.com'],
    contributes: {
      access: 2,
      searchEngines: ['google', 'google-maps'],
      extractors: ['google.maps.search', 'google.serp'],
    },
    name: 'Google',
    description:
      "Google web search (captcha-walled for automated loads) and Google Maps place search, which answers plain fetch through the Maps app's own /search?tbm=map JSON endpoint.",
  },
  {
    id: 'www.lazada.co.th',
    hosts: ['www.lazada.co.th', 'lazada.co.th'],
    contributes: {
      access: 1,
      searchEngines: ['lazada'],
      extractors: ['lazada.search'],
    },
    name: 'Lazada Thailand',
    description:
      'Lazada Thailand marketplace. The HTML search page is a client-rendered shell; the same URL with ajax=true returns the results as JSON over plain fetch.',
  },
  {
    id: 'www.olx.pl',
    hosts: ['www.olx.pl', 'olx.pl', '*.olx.pl'],
    contributes: {
      access: 1,
      searchEngines: ['olx'],
      extractors: ['olx.search'],
    },
    name: 'OLX Poland',
    description:
      "Poland's largest general classifieds site (OLX group). Refuses plain fetch; a browser gets a few pages before a 403.",
  },
  {
    id: 'www.otodom.pl',
    hosts: ['www.otodom.pl', 'otodom.pl'],
    contributes: {
      access: 1,
      searchEngines: ['otodom'],
      extractors: ['otodom.listing', 'otodom.search'],
    },
    name: 'Otodom',
    description:
      "Poland's largest property portal (OLX group): flats and houses to rent or buy. Pages embed their data; plain fetch works.",
  },
  {
    id: 'www.saos.org.pl',
    hosts: ['www.saos.org.pl', 'saos.org.pl'],
    contributes: {
      access: 1,
      searchEngines: ['saos'],
      extractors: ['saos.judgments'],
    },
    name: 'SAOS (Polish court judgments)',
    description:
      'SAOS, the System Analizy Orzeczeń Sądowych: an open REST API over ~550,000 Polish court decisions — common courts, the Supreme Court, the Constitutional Tribunal and the National Appeal Chamber (KIO) — with judges, keywords, full text and the legal acts each one cites (by Dziennik Ustaw entry).',
  },
  {
    id: 'www.zalando.pl',
    hosts: ['www.zalando.pl', 'zalando.pl'],
    contributes: {
      access: 1,
      searchEngines: ['zalando'],
      extractors: ['zalando.search'],
    },
    name: 'Zalando Poland',
    description:
      'Zalando Poland, a fashion shop with partner sellers. Results sit in an inline hydration script; plain fetch works.',
  },
  {
    id: 'core.proxies',
    hosts: [],
    contributes: {
      proxies: ['residential'],
    },
    name: 'Proxies',
    description: 'Proxies configured from the environment, for access rules to route through.',
    core: true,
  },
  {
    id: 'schema.org',
    hosts: [],
    contributes: {
      extractors: ['jsonld.schema-org'],
    },
    name: 'schema.org',
    description:
      "The schema.org vocabulary and the generic JSON-LD extractor (jsonld.schema-org) any site's embedded data goes through.",
    core: true,
  },
  {
    id: 'core.services',
    hosts: ['nominatim.openstreetmap.org', 'overpass-api.de'],
    contributes: {
      access: 1,
      services: ['nominatim', 'overpass'],
      extractors: ['clairic.address'],
    },
    name: 'Geo services',
    description:
      'Geocoding and OpenStreetMap services commands call, and the model-backed clairic.address extractor. Model providers are plugins of their own (api.cloudflare.com, api.deepseek.com).',
    core: true,
  },
  {
    id: 'allegro.pl',
    hosts: ['allegro.pl', 'www.allegro.pl'],
    contributes: {
      access: 1,
    },
    name: 'Allegro',
    description:
      "Poland's largest marketplace. DataDome-walled on every free backend; only the Web Unblocker got a results page.",
  },
  {
    id: 'allegrolokalnie.pl',
    hosts: ['allegrolokalnie.pl', 'www.allegrolokalnie.pl'],
    contributes: {
      access: 1,
      extractors: ['allegrolokalnie.search'],
    },
    name: 'Allegro Lokalnie',
    description:
      "Allegro's local classifieds site (mostly private sellers). Server-rendered search; plain fetch works.",
  },
  {
    id: 'api.cloudflare.com',
    hosts: ['api.cloudflare.com'],
    contributes: {
      access: 1,
      browsers: ['cloudflare'],
      models: ['cloudflare-workers-ai'],
      extractors: ['clairic.page'],
    },
    name: 'Cloudflare',
    description:
      "Cloudflare's API: Browser Run (remote Chromium over CDP) as a browser engine, and Workers AI — Clairic and Clef for extractors, and DeepSeek and other chat models for the search agent.",
  },
];

export const predicatesFixture: Predicate[] = [
  {
    iri: 'lh:CaseParty',
    synonyms: [],
    extractors: ['saos.judgments'],
    label: 'case party',
    description:
      'Class: a person or organisation that takes part in a court case; natural persons are anonymised and scoped to one decision.',
  },
  {
    iri: 'lh:Court',
    synonyms: [],
    extractors: ['saos.judgments'],
    label: 'court',
    description:
      'Class: a court or tribunal (Sąd Rejonowy w Gdyni, Sąd Najwyższy, Trybunał Konstytucyjny, Krajowa Izba Odwoławcza).',
  },
  {
    iri: 'lh:CourtDecision',
    synonyms: ['ruling', 'wyrok', 'judgment', 'orzeczenie'],
    extractors: ['saos.judgments'],
    label: 'court decision',
    description:
      'Class: a decision a court or tribunal gave in one case — a judgment, order or resolution (Polish orzeczenie: wyrok, postanowienie, uchwała).',
  },
  {
    iri: 'lh:Dealer',
    synonyms: [],
    extractors: ['otomoto.search'],
    label: 'dealer',
    description: 'Class: a business that sells vehicles, such as a brand dealership or used-car dealer.',
  },
  {
    iri: 'lh:Judge',
    synonyms: [],
    extractors: ['saos.judgments'],
    label: 'judge',
    description:
      'Class: a judge, as named on the decisions of one court (the same name at another court is another node: names are not unique).',
  },
  {
    iri: 'lh:LegalChange',
    synonyms: [],
    extractors: ['sejm.acts'],
    label: 'legal change',
    description:
      'Class: one change one act made to another (an amendment, a repeal, a ruling), with the date it took effect.',
  },
  {
    iri: 'lh:LegislativeProcess',
    synonyms: ['bill', 'projekt ustawy'],
    extractors: ['sejm.acts'],
    label: 'legislative process',
    description:
      "Class: a bill's passage through a legislature, from submission to enactment or rejection (Polish proces legislacyjny).",
  },
  {
    iri: 'lh:Outfit',
    synonyms: [],
    extractors: ['pinterest.search'],
    label: 'outfit',
    description:
      'Class: one look — the garments a person wears together (or laid out as one outfit), as an image shows it.',
  },
  {
    iri: 'lh:ParliamentaryPrint',
    synonyms: [],
    extractors: ['sejm.processes'],
    label: 'parliamentary print',
    description: 'Class: a numbered parliamentary print (druk sejmowy): a bill, its amendments, a committee report.',
  },
  {
    iri: 'lh:ProductListing',
    synonyms: [],
    extractors: ['lazada.search'],
    label: 'product listing',
    description: 'Class: a product offered by a shop or marketplace seller, as one search result or product page.',
  },
  {
    iri: 'lh:PublicAuthority',
    synonyms: [],
    extractors: ['sejm.acts'],
    label: 'public authority',
    description: 'Class: a public body that passes acts or is named by them (Sejm, Rada Ministrów, a minister).',
  },
  {
    iri: 'lh:RentalListing',
    synonyms: [],
    extractors: ['otodom.listing'],
    label: 'rental listing',
    description: 'Class: an advertisement offering a flat or house for rent.',
  },
  {
    iri: 'lh:SaleListing',
    synonyms: [],
    extractors: ['thailandproperty.search'],
    label: 'sale listing',
    description: 'Class: an advertisement offering property (a flat, house or land) for sale.',
  },
  {
    iri: 'lh:VehicleListing',
    synonyms: [],
    extractors: ['otomoto.search'],
    label: 'vehicle listing',
    description: 'Class: an advertisement offering a vehicle (car, motorcycle) for sale or lease.',
  },
  {
    iri: 'eli:amended_by',
    synonyms: [],
    extractors: ['sejm.acts'],
    label: 'amended by',
    description: 'This act is amended by the other act.',
    range: 'eli:LegalResource',
  },
  {
    iri: 'eli:amends',
    synonyms: [],
    extractors: ['sejm.acts'],
    label: 'amends',
    description: 'This act amends the other act.',
    range: 'eli:LegalResource',
  },
  {
    iri: 'eli:based_on',
    synonyms: [],
    extractors: ['sejm.acts'],
    label: 'based on',
    description: 'This act was issued on the basis of the other act (its legal basis, upoważnienie ustawowe).',
    range: 'eli:LegalResource',
  },
  {
    iri: 'eli:basis_for',
    synonyms: [],
    extractors: ['sejm.acts'],
    label: 'basis for',
    description: 'The other act (an implementing regulation) was issued on the basis of this act.',
    range: 'eli:LegalResource',
  },
  {
    iri: 'eli:changed_by',
    synonyms: [],
    extractors: ['sejm.acts'],
    label: 'changed by',
    description: "The other act (e.g. a Constitutional Tribunal ruling) changes this act's legal state.",
    range: 'eli:LegalResource',
  },
  {
    iri: 'eli:changes',
    synonyms: [],
    extractors: ['sejm.acts'],
    label: 'changes',
    description: "This act (a Constitutional Tribunal ruling, a correction) changes the other act's legal state.",
    range: 'eli:LegalResource',
  },
  {
    iri: 'eli:cites',
    synonyms: [],
    extractors: ['sejm.acts'],
    label: 'cites',
    description: 'This act refers to the other act (ISAP: Odesłania).',
    range: 'eli:LegalResource',
  },
  {
    iri: 'eli:consolidated_by',
    synonyms: [],
    extractors: ['sejm.acts'],
    label: 'consolidated by',
    description: 'A consolidated text (tekst jednolity) restates this act as amended.',
    range: 'eli:LegalResource',
  },
  {
    iri: 'eli:consolidates',
    synonyms: [],
    extractors: ['sejm.acts'],
    label: 'consolidates',
    description: 'This consolidated text (tekst jednolity) restates the other act as amended.',
    range: 'eli:LegalResource',
  },
  {
    iri: 'eli:corrected_by',
    synonyms: [],
    extractors: ['sejm.acts'],
    label: 'corrected by',
    description: 'The other act corrects errors in this act (sprostowanie).',
    range: 'eli:LegalResource',
  },
  {
    iri: 'eli:corrects',
    synonyms: [],
    extractors: ['sejm.acts'],
    label: 'corrects',
    description: 'This act corrects errors in the other act (sprostowanie).',
    range: 'eli:LegalResource',
  },
  {
    iri: 'eli:date_applicability',
    synonyms: [],
    extractors: ['sejm.acts'],
    label: 'date applicability',
    description: 'The date a change (an amendment or repeal) took effect for the changed act.',
    range: 'xsd:date',
  },
  {
    iri: 'eli:date_document',
    synonyms: [],
    extractors: ['sejm.acts'],
    label: 'date document',
    description: "The date the act bears (the date it was passed or signed: 'z dnia …').",
    range: 'xsd:date',
  },
  {
    iri: 'eli:date_no_longer_in_force',
    synonyms: [],
    extractors: ['sejm.acts'],
    label: 'date no longer in force',
    description: 'The date the act stopped being in force (uchylenie, wygaśnięcie).',
    range: 'xsd:date',
  },
];

export const issuesFixture: Issue[] = [
  {
    id: 'iss-ac44a460',
    status: 'open',
    kind: 'extractor',
    title: 'otodom.listing drops balcony from lh:amenity when it is the only extra',
    body: 'On this listing the page text shows "Informacje dodatkowe: winda garaż/miejsce parkingowe pom. użytkowe klimatyzacja oddzielna kuchnia balkon", but the extracted lh:amenity set is closed_area,dishwasher,entryphone,fridge,furniture,garage,internet,lift,monitoring,oven,phone,stove,tv,usable_room,washing_machine,cable_television,anti_burglary_door,air_conditioning — no "balcony" even though the listing clearly has one. Same for …/mieszkanie-w-kamienicy-na-powislu-ID4DGTH and …/2',
    opened: '2026-10-28T11:08:11.572Z',
    updated: '2026-10-28T11:08:11.572Z',
    seen: 1,
    notes: [],
    domain: 'www.otodom.pl',
    url: 'https://www.otodom.pl/pl/oferta/500m-do-metra-klimatyzacja-loggia-garaz-ID4DqRY',
    severity: 'medium',
    by: 'web-20261028-110009',
  },
  {
    id: 'iss-41efcbd8',
    status: 'open',
    kind: 'provider',
    title: 'otodom engine ignores extras (BALCONY) and location list in multi-location search',
    body: 'Called the otodom engine with params {"transaction":"wynajem","estate":"mieszkanie","locations":["mazowieckie/warszawa/warszawa/warszawa/srodmiescie","mazowieckie/warszawa/warszawa/warszawa/wola","mazowieckie/warszawa/warszawa/warszawa/mokotow"],"priceMax":6000,"extras":["BALCONY"],"limit":72}.\n\nExpected: only listings in Śródmieście/Wola/Mokotów that have a balcony.\nGot: 70 results including Ursynów (e.g. …/112m-3-sypialnie-2-balkony-metro-bez-prowizji-ID4CUBk, lh:district "',
    opened: '2026-10-28T11:08:11.566Z',
    updated: '2026-10-28T11:08:11.566Z',
    seen: 1,
    notes: [],
    domain: 'www.otodom.pl',
    url: 'https://www.otodom.pl/pl/wyniki/wynajem/mieszkanie/wiele-lokalizacji?locations=%5Bmazowieckie%2Fwarszawa%2Fwarszawa%2Fwarszawa%2Fsrodmiescie%2Cmazowieckie%2Fwarszawa%2Fwarszawa%2Fwarszawa%2Fwola%2Cmazowieckie%2Fwarszawa%2Fwarszawa%2Fwarszawa%2Fmokotow%5D&priceMax=6000&extras=%5BBALCONY%5D&limit=72',
    severity: 'medium',
    by: 'web-20261028-110009',
  },
  {
    id: 'iss-90893325',
    status: 'open',
    kind: 'harness',
    title: "rating model 'match' pattern ignores regex alternation and (?i) flags",
    body: 'In a rating model term {match:"schema:name", pattern:"(?i)windbreaker|jersey|vest|gilet"} scored 0 for every result (no result with those words in schema:name rose in the top list), while single lowercase words such as "hoodie", "vest", "layer" matched correctly (case-insensitively: "Layering", "Hoodies" matched). So regex alternation and/or inline (?i) flags appear to be treated as literal text and fail silently. Expected: either full regex support, or a documented plain-sub',
    opened: '2026-10-28T11:07:25.888Z',
    updated: '2026-10-28T11:07:25.888Z',
    seen: 1,
    notes: [],
    severity: 'low',
    by: 'yt-winter-layering',
  },
  {
    id: 'iss-1fa4ca36',
    status: 'open',
    kind: 'extractor',
    title: 'meepleradar.com Bangkok café directory renders an empty app shell — no places extracted',
    body: 'Browsed https://meepleradar.com/explore?city=Bangkok,%20Thailand (a board game café finder). Plain fetch was blocked with 429, webunblocker got 200 but the text is only navigation/footer ("Board Game Cafe Found in Bangkok, Thailand") with no café list; 0 facts extracted. The place data is likely loaded client-side (map + JSON API). A plugin/extractor for meepleradar\'s place API would give library-size info per café.',
    opened: '2026-10-28T10:59:51.082Z',
    updated: '2026-10-28T10:59:51.082Z',
    seen: 1,
    notes: [],
    domain: 'meepleradar.com',
    url: 'https://meepleradar.com/explore?city=Bangkok,%20Thailand',
    severity: 'low',
    by: 'composer-20261028-105607',
  },
  {
    id: 'iss-24a930fd',
    status: 'open',
    kind: 'provider',
    title: 'bing web search returns 0 results for a long quoted query',
    body: 'Ran bing with q="Bangkok board game cafe \\"games\\" library 1,000 games Dice Cup GameHaus Battlefield" (mkt en-US). The results page loaded (snap_03e22d89a3, status 200) but the engine reported total 0 with no items, while duckduckgo returned 10 results for a similar query. Expected at least some results, or a note that the query was too restrictive.',
    opened: '2026-10-28T10:59:51.076Z',
    updated: '2026-10-28T10:59:51.076Z',
    seen: 1,
    notes: [],
    domain: 'www.bing.com',
    url: 'https://www.bing.com/search?q=Bangkok%20board%20game%20cafe%20%22games%22%20library%201%2C000%20games%20Dice%20Cup%20GameHaus%20Battlefield',
    severity: 'medium',
    by: 'composer-20261028-105607',
  },
  {
    id: 'iss-71678853',
    status: 'open',
    kind: 'harness',
    title:
      'agent continue --pages is the session total, not an allowance for the follow-up: a follow-up with --pages below what was spent can load nothing',
    body: "person-dmytro-maretskyi: 45 pages spent in the first input, then 'agent continue \"…\" --pages 30' — every search/browse in the follow-up was refused (0 new pages) and the agent reported it as 'page budget exhausted'. person-mykola-weremchuk had 27 spent and got 3. Either make --pages (and --usd, --minutes?) on continue mean 'this much more', or refuse a limit below the spend with a hint naming the total to pass. Seen 2026-10-28.",
    opened: '2026-10-28T10:51:20.054Z',
    updated: '2026-10-28T10:51:20.054Z',
    seen: 1,
    notes: [],
    domain: 'lighthouse',
    by: 'claude-code',
  },
  {
    id: 'iss-2fb9c37b',
    status: 'fixed',
    kind: 'harness',
    title: 'set_rating_model `require` never matches: every result reported as missing all requirements',
    body: 'Setting a rating model on lh:Outfit with two requirements, e.g. {"label":"Hoodie worn under the top layer","op":"match","target":"hoodie under","value":{"match":{"prop":"lh:layering","pattern":"hoodie under"}}}. The model is accepted, but the returned "top" list shows every one of the 1042 rated results with `missed` = both requirement labels, including results whose lh:layering is literally "hoodie under puffer vest" (verified via subjects). Also tried op "contains" with val',
    opened: '2026-10-28T10:55:28.868Z',
    updated: '2026-10-28T10:57:51.962Z',
    seen: 1,
    notes: [
      {
        t: '2026-10-28T10:57:51.962Z',
        by: 'claude-code',
        text: "set_rating_model now rejects requirement ops outside < <= > >= = != and malformed term/requirement values (e.g. {match:{prop,pattern}}), with the right form in the error; tool description documents requirements ({match, pattern} with op '='",
        status: 'fixed',
      },
    ],
    domain: 'lighthouse',
    severity: 'medium',
    by: 'outfits-1',
    resolution:
      "set_rating_model now rejects requirement ops outside < <= > >= = != and malformed term/requirement values (e.g. {match:{prop,pattern}}), with the right form in the error; tool description documents requirements ({match, pattern} with op '='",
  },
  {
    id: 'iss-3c719efb',
    status: 'fixed',
    kind: 'harness',
    title: 'Results panel counts FAQ questions and answers (schema:Question, schema:FAQPage) as results',
    body: 'isResult (src/agent/results.ts) keeps any named subject outside SCAFFOLD. In the 31 sessions up to 2026-10-28, 17 schema:Question, 3 schema:FAQPage and 3 schema:Article results came from jsonld.schema-org reading sites\' FAQ markup (e.g. a venue\'s "Do you have parking?"), and were rated beside the venues. Suggest adding schema:Question, schema:Answer, schema:FAQPage (and probably schema:Article/BlogPosting unless the goal is articles) to SCAFFOLD, or rating only the RatingMode',
    opened: '2026-10-28T09:14:51.327Z',
    updated: '2026-10-28T09:20:54.851Z',
    seen: 1,
    notes: [
      {
        t: '2026-10-28T09:20:54.851Z',
        by: 'claude-code',
        text: '4548acd: schema:Question, schema:Answer, schema:FAQPage added to SCAFFOLD in src/agent/results.ts (30 FAQ subjects across past sessions no longer rated; 3,135 -> 3,105 results). web/src/results.ts has its own SCAFFOLD copy that still needs ',
        status: 'fixed',
      },
    ],
    severity: 'low',
    by: 'agent:claude-code',
    resolution:
      '4548acd: schema:Question, schema:Answer, schema:FAQPage added to SCAFFOLD in src/agent/results.ts (30 FAQ subjects across past sessions no longer rated; 3,135 -> 3,105 results). web/src/results.ts has its own SCAFFOLD copy that still needs ',
  },
  {
    id: 'iss-573d3393',
    status: 'fixed',
    kind: 'harness',
    title: 'Follow-up turns resend the whole session history',
    body: 'A feedback rebuild on web-20261027-184700 sent 106k input tokens ($0.034) for one set_rating_model call. Consider pi-durable compaction thresholds for long sessions, or a handoff/reset for feedback-only turns.',
    opened: '2026-10-27T19:15:52.109Z',
    updated: '2026-10-28T09:14:38.736Z',
    seen: 1,
    notes: [
      {
        t: '2026-10-27T20:21:29.205Z',
        by: 'claude-code',
        text: '',
        status: 'open',
      },
      {
        t: '2026-10-28T09:14:38.736Z',
        by: 'claude-code',
        text: 'c390f7c: an input that starts >90 s after the last model turn (prompt cache cold) stubs older tool results (>400 chars) and drops earlier reasoning in model requests; storage and trajectory stay whole. A/B on two copies of web-20261027-1847',
        status: 'fixed',
      },
    ],
    severity: 'medium',
    by: 'claude-code',
    resolution:
      'c390f7c: an input that starts >90 s after the last model turn (prompt cache cold) stubs older tool results (>400 chars) and drops earlier reasoning in model requests; storage and trajectory stay whole. A/B on two copies of web-20261027-1847',
  },
  {
    id: 'iss-7b3c1ab2',
    status: 'wontfix',
    kind: 'blocked',
    title: 'api.sejm.gov.pl text.html of consolidated Kodeks pracy returns 200 with 0 bytes',
    body: "GET https://api.sejm.gov.pl/eli/acts/DU/2026/1245/text.html -> status 200, bytes 0, textLength 0 (snapshot snap_858498e2f6). Site notes say a consolidated text's text.html is ~0.5 MB, so the empty body looks wrong (maybe redirect/compression issue in fetch backend). Expected the HTML of the consolidated Labour Code.",
    opened: '2026-10-28T09:09:34.530Z',
    updated: '2026-10-28T09:18:04.237Z',
    seen: 1,
    notes: [
      {
        t: '2026-10-28T09:18:03.136Z',
        by: 'claude-code',
        text: 'Not a fetch bug: DU/2026/1245 and DU/2025/277 have textHTML=false in their records (texts are PDF only: D20261245.pdf …), and the API answers text.html for such acts with an empty 200. sejm.acts writes lh:fullTextUrl only when textHTML is t',
      },
      {
        t: '2026-10-28T09:18:04.237Z',
        by: 'claude-code',
        text: 'Source behaviour, documented; PDF reading tracked in its own issue.',
        status: 'wontfix',
      },
    ],
    domain: 'api.sejm.gov.pl',
    url: 'https://api.sejm.gov.pl/eli/acts/DU/2026/1245/text.html',
    severity: 'high',
    by: 'legal-kodeks-pracy',
    resolution: 'Source behaviour, documented; PDF reading tracked in its own issue.',
  },
  {
    id: 'iss-88ddf2a6',
    status: 'wontfix',
    kind: 'harness',
    title: 'test-x',
    body: 'y',
    opened: '2026-10-27T19:55:13.343Z',
    updated: '2026-10-27T19:55:30.083Z',
    seen: 1,
    notes: [
      {
        t: '2026-10-27T19:55:30.083Z',
        by: 'claude-code',
        text: 'Test issue filed by mistake (bkk places session).',
        status: 'wontfix',
      },
    ],
    domain: 'lighthouse-agent',
    by: 'claude-code',
    resolution: 'Test issue filed by mistake (bkk places session).',
  },
];

export const storageFixture: StorageReport = {
  workspace: '~/lighthouse/.lighthouse',
  at: '2026-10-28T11:14:11.747Z',
  disk: {
    total: 1536360196,
    areas: [
      {
        id: 'snapshots',
        label: 'Snapshots',
        what: 'Page HTML, screenshots and accessibility trees, one folder per load',
        bytes: 1065044762,
        files: 2511,
      },
      {
        id: 'store',
        label: 'Graph store',
        what: 'RocksDB files of the RDF store (facts, provenance, ontology)',
        bytes: 290252630,
        files: 1029,
      },
      {
        id: 'other',
        label: 'Other',
        what: 'Daemon log, issues, imports and small files',
        bytes: 90087719,
        files: 845,
      },
      {
        id: 'trajectories',
        label: 'Trajectories',
        what: 'Session event logs, agent conversations and blobs',
        bytes: 79017192,
        files: 5034,
      },
      {
        id: 'osm',
        label: 'OpenStreetMap',
        what: 'Map extracts used for geocoding',
        bytes: 9547493,
        files: 2,
      },
      {
        id: 'lighthouse.db',
        label: 'Workspace database',
        what: 'Snapshot index and the remote-answer cache (SQLite, with its WAL)',
        bytes: 2410400,
        files: 3,
      },
    ],
  },
  snapshots: {
    n: 2268,
    bytes: 1060636989,
    oldest: '2026-10-27T14:14:32.588Z',
    newest: '2026-10-28T11:14:10.945Z',
    screenshots: 0,
    a11y: 137,
    byBackend: [
      {
        backend: 'fetch',
        n: 2052,
        bytes: 913754082,
      },
      {
        backend: 'webunblocker',
        n: 78,
        bytes: 36943459,
      },
      {
        backend: 'playwright',
        n: 61,
        bytes: 44574545,
      },
      {
        backend: 'cloudflare',
        n: 61,
        bytes: 52250242,
      },
      {
        backend: 'stealth',
        n: 16,
        bytes: 13114661,
      },
    ],
    byHost: [
      {
        host: 'www.youtube.com',
        n: 202,
        bytes: 293911654,
      },
      {
        host: 'www.otodom.pl',
        n: 167,
        bytes: 99254071,
      },
      {
        host: 'www.vinted.pl',
        n: 22,
        bytes: 75455898,
      },
      {
        host: 'www.otomoto.pl',
        n: 45,
        bytes: 65338720,
      },
      {
        host: 'justjoin.it',
        n: 37,
        bytes: 37131709,
      },
      {
        host: 'www.fotocasa.es',
        n: 20,
        bytes: 30059296,
      },
      {
        host: 'www.habitaclia.com',
        n: 22,
        bytes: 25280881,
      },
      {
        host: 'www.ebay.de',
        n: 6,
        bytes: 23611908,
      },
      {
        host: 'www.pinterest.com',
        n: 62,
        bytes: 23516103,
      },
      {
        host: 'www.lazada.co.th',
        n: 13,
        bytes: 20556842,
      },
    ],
  },
  cache: [
    {
      namespace: 'clef.street',
      entries: 2,
      bytes: 4270,
      oldest: '2026-10-27T14:57:57.642Z',
      newest: '2026-10-27T14:57:58.167Z',
    },
    {
      namespace: 'pace',
      entries: 116,
      bytes: 3274,
      oldest: '2026-10-27T17:46:34.154Z',
      newest: '2026-10-28T11:14:10.181Z',
    },
    {
      namespace: 'nominatim',
      entries: 30,
      bytes: 1396,
      oldest: '2026-10-27T14:56:37.084Z',
      newest: '2026-10-27T14:57:21.809Z',
    },
  ],
  store: {
    size: {
      value: 781054,
      ms: 64,
    },
    graphs: {
      value: {
        all: 2731,
        superseded: 484,
      },
      ms: 9,
    },
    extractors: {
      value: [
        {
          extractor: 'jsonld.schema-org@0.2.0',
          graphs: 200,
        },
        {
          extractor: 'clairic.page@0.3.0',
          graphs: 190,
        },
        {
          extractor: 'youtube.watch@0.1.0',
          graphs: 166,
        },
        {
          extractor: 'hn.search@0.1.0',
          graphs: 161,
        },
        {
          extractor: 'clairic.address@0.1.0',
          graphs: 152,
        },
        {
          extractor: 'otodom.listing@0.3.0',
          graphs: 152,
        },
        {
          extractor: 'geocode.osm@0.1.0',
          graphs: 105,
        },
        {
          extractor: 'otodom.listing@0.1.0',
          graphs: 103,
        },
        {
          extractor: 'otodom.listing@0.2.0',
          graphs: 103,
        },
        {
          extractor: 'duckduckgo.serp@0.1.0',
          graphs: 87,
        },
        {
          extractor: 'jsonld.schema-org@0.1.0',
          graphs: 60,
        },
        {
          extractor: 'google.maps.search@0.1.0',
          graphs: 49,
        },
      ],
      ms: 11,
    },
    types: {
      value: [
        {
          type: 'https://schema.org/Person',
          subjects: 4873,
        },
        {
          type: 'https://marets.ky/lighthouse/ns#ProductListing',
          subjects: 2662,
        },
        {
          type: 'https://schema.org/Organization',
          subjects: 2267,
        },
        {
          type: 'https://schema.org/DiscussionForumPosting',
          subjects: 2120,
        },
        {
          type: 'https://marets.ky/lighthouse/ns#SaleListing',
          subjects: 2044,
        },
        {
          type: 'https://schema.org/ImageObject',
          subjects: 2038,
        },
        {
          type: 'https://marets.ky/lighthouse/ns#CourtDecision',
          subjects: 1336,
        },
        {
          type: 'https://marets.ky/lighthouse/ns#SearchResult',
          subjects: 1315,
        },
        {
          type: 'https://schema.org/PostalAddress',
          subjects: 1295,
        },
        {
          type: 'https://schema.org/PropertyValue',
          subjects: 1278,
        },
        {
          type: 'https://schema.org/GeoCoordinates',
          subjects: 1101,
        },
        {
          type: 'http://data.europa.eu/eli/ontology#LegalResourceSubdivision',
          subjects: 1097,
        },
      ],
      ms: 20,
    },
    predicates: {
      value: [
        {
          predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
          quads: 74058,
        },
        {
          predicate: 'https://schema.org/name',
          quads: 51307,
        },
        {
          predicate: 'https://schema.org/url',
          quads: 31328,
        },
        {
          predicate: 'https://marets.ky/lighthouse/ns#site',
          quads: 27035,
        },
        {
          predicate: 'https://marets.ky/lighthouse/ns#foundBy',
          quads: 26326,
        },
        {
          predicate: 'https://schema.org/citation',
          quads: 24771,
        },
        {
          predicate: 'https://schema.org/keywords',
          quads: 24514,
        },
        {
          predicate: 'https://schema.org/identifier',
          quads: 22537,
        },
        {
          predicate: 'https://schema.org/skills',
          quads: 16679,
        },
        {
          predicate: 'https://schema.org/description',
          quads: 14610,
        },
        {
          predicate: 'https://schema.org/image',
          quads: 13929,
        },
        {
          predicate: 'https://marets.ky/lighthouse/ns#amenity',
          quads: 13039,
        },
      ],
      ms: 206,
    },
    daemon: {
      pid: 75446,
      socket: '~/lighthouse/.lighthouse/daemon.sock',
      port: 4319,
      workspace: '~/lighthouse/.lighthouse',
      started: '2026-10-28T10:35:56.431Z',
      uptimeSeconds: 2296,
      idleSeconds: 0,
      idleExitSeconds: 600,
      requests: 9253,
      store: {
        open: true,
        path: '~/lighthouse/.lighthouse/store',
        queries: 0,
        queued: 0,
        size: 781054,
      },
      events: {
        subscribers: 3,
        trajectories: '~/lighthouse/.lighthouse/trajectories',
      },
      sessions: {
        live: [
          {
            run: 'yt-localfirst-talks',
            inflight: 1,
          },
        ],
      },
      api: {
        streams: 5,
        port: 4319,
      },
    },
  },
};
