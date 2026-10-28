//
// Copyright 2026 DXOS.org
//

import { type NodeFacts, type SubjectGraph } from '#client';

/**
 * A real neighbourhood: `lighthouse graph https://www.linkedin.com/in/richburdon --depth 2 --limit 60` from the
 * person-rich-burdon session, trimmed to 36 nodes (long descriptions clipped).
 */
export const graphFixture: SubjectGraph = {
  roots: ['https://github.com/richburdon'],
  nodes: [
    {
      id: 'https://github.com/richburdon',
      types: ['schema:Person', 'schema:WebPage'],
      label: 'Rich Burdon',
      props: {
        'schema:description': [
          'Founder of DXOS.\r\n',
          'Rich Burdon is an entrepreneur and technical leader currently working on infrastructure technologies at Google. Before joining Google, Ri...',
          'Rich Burdon is the Founder of DXOS, a company developing an open-source framework for building real-time, collaborative web applications that r...',
        ],
        'schema:dateCreated': ['2013-02-10T06:07:15Z'],
        'schema:knowsAbout': ['ceo', 'technology', 'entrepreneurship'],
        'schema:identifier': ['richburdon'],
        'schema:url': ['http://richburdon.com'],
      },
      image: 'https://avatars.githubusercontent.com/u/3523355?v=4',
      depth: 0,
    },
    {
      id: 'https://www.linkedin.com/in/richburdon#role-worksFor-dxos-org-0',
      types: ['schema:EmployeeRole'],
      label: 'DXOS - LinkedIn',
      props: {},
      depth: 0,
    },
    {
      id: 'https://github.com/dxos',
      types: ['schema:Organization'],
      label: 'DXOS',
      props: {
        'schema:description': ['The Decentralized Operating System'],
        'schema:dateCreated': ['2019-10-30T13:24:08Z'],
        'schema:identifier': ['dxos'],
        'schema:url': ['https://dxos.org'],
      },
      image: 'https://avatars.githubusercontent.com/u/57182821?v=4',
      depth: 1,
    },
    {
      id: 'https://www.linkedin.com/in/richburdon#role-alumniOf-university-of-sheffield-7',
      types: ['schema:OrganizationRole'],
      label: 'The University of Sheffield (1987–1991)',
      props: {
        'schema:startDate': ['1987'],
        'schema:endDate': ['1991'],
      },
      depth: 0,
    },
    {
      id: 'https://github.com/richburdon/blog',
      types: ['schema:SoftwareSourceCode'],
      label: 'blog',
      props: {
        'schema:description': ['Blog with Gatsby'],
        'schema:dateCreated': ['2020-05-16T22:10:41Z'],
        'lh:starCount': [0],
        'schema:programmingLanguage': ['JavaScript'],
        'schema:identifier': ['richburdon/blog'],
      },
      depth: 1,
    },
    {
      id: 'https://github.com/dxos/dxos',
      types: ['schema:SoftwareSourceCode'],
      label: 'dxos',
      props: {
        'schema:description': ['TypeScript implementation of the DXOS protocols, SDK, toolchain and Composer.'],
        'schema:dateCreated': ['2021-04-07T08:13:23Z'],
        'lh:starCount': [530],
        'schema:programmingLanguage': ['TypeScript'],
        'schema:identifier': ['dxos/dxos'],
        'schema:url': ['https://dxos.org'],
      },
      depth: 1,
    },
    {
      id: 'https://www.crunchbase.com/person/rich-burdon#role-worksFor-braneframe-d6440fb9',
      types: ['schema:EmployeeRole'],
      label: 'CEO (2021-04-01–)',
      props: {
        'schema:roleName': ['CEO'],
        'schema:startDate': ['2021-04-01'],
      },
      depth: 0,
    },
    {
      id: 'https://github.com/richburdon/gstudio-test',
      types: ['schema:SoftwareSourceCode'],
      label: 'gstudio-test',
      props: {
        'schema:description': ['Test'],
        'schema:dateCreated': ['2025-09-28T11:38:09Z'],
        'lh:starCount': [0],
        'schema:programmingLanguage': ['TypeScript'],
        'schema:identifier': ['richburdon/gstudio-test'],
      },
      depth: 1,
    },
    {
      id: 'https://www.crunchbase.com/person/rich-burdon#role-worksFor-google-1b2e3408',
      types: ['schema:EmployeeRole'],
      label: 'Software Engineer (2005-11–2015-11)',
      props: {
        'schema:roleName': ['Software Engineer'],
        'schema:startDate': ['2005-11'],
        'schema:endDate': ['2015-11'],
      },
      depth: 0,
    },
    {
      id: 'https://github.com/richburdon/meteor-snowplow',
      types: ['schema:SoftwareSourceCode'],
      label: 'meteor-snowplow',
      props: {
        'schema:dateCreated': ['2015-06-27T23:28:05Z'],
        'lh:starCount': [0],
        'schema:programmingLanguage': ['JavaScript'],
        'schema:identifier': ['richburdon/meteor-snowplow'],
      },
      depth: 1,
    },
    {
      id: 'https://www.crunchbase.com/person/rich-burdon#role-worksFor-goldman-sachs-05e08dec',
      types: ['schema:EmployeeRole'],
      label: 'Team Member (1993–1996)',
      props: {
        'schema:roleName': ['Team Member'],
        'schema:startDate': ['1993'],
        'schema:endDate': ['1996'],
      },
      depth: 0,
    },
    {
      id: 'https://github.com/richburdon/sanity-blog',
      types: ['schema:SoftwareSourceCode'],
      label: 'sanity-blog',
      props: {
        'schema:description': ['Blog with Gatsby'],
        'schema:dateCreated': ['2020-05-16T21:58:41Z'],
        'lh:starCount': [0],
        'schema:programmingLanguage': ['JavaScript'],
        'schema:identifier': ['richburdon/sanity-blog'],
      },
      depth: 1,
    },
    {
      id: 'https://www.crunchbase.com/person/rich-burdon#role-worksFor-wireline-85525662',
      types: ['schema:EmployeeRole'],
      label: 'Co-founder and CEO (?–2021-03)',
      props: {
        'schema:roleName': ['Co-founder and CEO'],
        'schema:endDate': ['2021-03'],
      },
      depth: 0,
    },
    {
      id: 'https://github.com/richburdon/dark-proto',
      types: ['schema:SoftwareSourceCode'],
      label: 'dark-proto',
      props: {
        'schema:dateCreated': ['2015-05-17T18:20:05Z'],
        'lh:starCount': [0],
        'schema:programmingLanguage': ['Java'],
        'schema:identifier': ['richburdon/dark-proto'],
      },
      depth: 1,
    },
    {
      id: 'https://www.crunchbase.com/person/rich-burdon#role-worksFor-d-e-shaw-co-2ccd6588',
      types: ['schema:EmployeeRole'],
      label: 'Team Member (1996–1998)',
      props: {
        'schema:roleName': ['Team Member'],
        'schema:startDate': ['1996'],
        'schema:endDate': ['1998'],
      },
      depth: 0,
    },
    {
      id: 'https://github.com/richburdon/flask-demo',
      types: ['schema:SoftwareSourceCode'],
      label: 'flask-demo',
      props: {
        'schema:dateCreated': ['2015-07-05T17:24:50Z'],
        'lh:starCount': [0],
        'schema:programmingLanguage': ['JavaScript'],
        'schema:identifier': ['richburdon/flask-demo'],
      },
      depth: 1,
    },
    {
      id: 'https://www.crunchbase.com/person/rich-burdon#role-worksFor-the-brain-ef99cd67',
      types: ['schema:EmployeeRole'],
      label: 'VP, Engineering (1998–2000)',
      props: {
        'schema:roleName': ['VP, Engineering'],
        'schema:startDate': ['1998'],
        'schema:endDate': ['2000'],
      },
      depth: 0,
    },
    {
      id: 'https://github.com/richburdon/meteor-base',
      types: ['schema:SoftwareSourceCode'],
      label: 'meteor-base',
      props: {
        'schema:dateCreated': ['2015-07-01T18:09:11Z'],
        'lh:starCount': [0],
        'schema:identifier': ['richburdon/meteor-base'],
      },
      depth: 1,
    },
    {
      id: 'https://www.crunchbase.com/person/rich-burdon#role-worksFor-braneframe-0',
      types: ['schema:EmployeeRole'],
      label: 'BRANEFRAME - Crunchbase Company Profile & Funding',
      props: {},
      depth: 0,
    },
    {
      id: 'https://github.com/richburdon/webstorm-settings',
      types: ['schema:SoftwareSourceCode'],
      label: 'webstorm-settings',
      props: {
        'schema:dateCreated': ['2022-09-22T16:15:43Z'],
        'lh:starCount': [0],
        'schema:programmingLanguage': ['TypeScript'],
        'schema:identifier': ['richburdon/webstorm-settings'],
      },
      depth: 1,
    },
    {
      id: 'https://github.com/richburdon/react-json-tree',
      types: ['schema:SoftwareSourceCode'],
      label: 'react-json-tree',
      props: {
        'schema:dateCreated': ['2020-02-14T16:32:52Z'],
        'lh:starCount': [0],
        'schema:identifier': ['richburdon/react-json-tree'],
      },
      depth: 1,
    },
    {
      id: 'https://github.com/richburdon/richburdon.github.io',
      types: ['schema:SoftwareSourceCode'],
      label: 'richburdon.github.io',
      props: {
        'schema:dateCreated': ['2021-01-24T18:50:34Z'],
        'lh:starCount': [0],
        'schema:programmingLanguage': ['JavaScript'],
        'schema:identifier': ['richburdon/richburdon.github.io'],
      },
      depth: 1,
    },
    {
      id: 'https://github.com/richburdon/nginx-demo',
      types: ['schema:SoftwareSourceCode'],
      label: 'nginx-demo',
      props: {
        'schema:dateCreated': ['2015-07-16T17:02:24Z'],
        'lh:starCount': [0],
        'schema:programmingLanguage': ['Shell'],
        'schema:identifier': ['richburdon/nginx-demo'],
      },
      depth: 1,
    },
    {
      id: 'https://github.com/richburdon/dark-zero',
      types: ['schema:SoftwareSourceCode'],
      label: 'dark-zero',
      props: {
        'schema:dateCreated': ['2015-04-28T18:38:34Z'],
        'lh:starCount': [0],
        'schema:programmingLanguage': ['Python'],
        'schema:identifier': ['richburdon/dark-zero'],
      },
      depth: 1,
    },
    {
      id: 'https://github.com/richburdon/meteor-demo',
      types: ['schema:SoftwareSourceCode'],
      label: 'meteor-demo',
      props: {
        'schema:dateCreated': ['2015-07-04T14:45:26Z'],
        'lh:starCount': [0],
        'schema:programmingLanguage': ['Shell'],
        'schema:identifier': ['richburdon/meteor-demo'],
      },
      depth: 1,
    },
    {
      id: 'https://github.com/richburdon/TestPlatform',
      types: ['schema:SoftwareSourceCode'],
      label: 'TestPlatform',
      props: {
        'schema:dateCreated': ['2021-01-01T17:32:46Z'],
        'lh:starCount': [0],
        'schema:programmingLanguage': ['C#'],
        'schema:identifier': ['richburdon/TestPlatform'],
      },
      depth: 1,
    },
    {
      id: 'https://www.linkedin.com/company/dxos-org',
      types: ['schema:Organization', 'schema:WebPage'],
      label: 'DXOS - LinkedIn',
      props: {},
      depth: 1,
    },
    {
      id: 'https://www.linkedin.com/school/university-of-sheffield',
      types: ['schema:EducationalOrganization'],
      label: 'The University of Sheffield',
      props: {},
      depth: 1,
    },
    {
      id: 'https://www.crunchbase.com/organization/braneframe',
      types: ['schema:Organization', 'schema:WebPage'],
      label: 'BRANEFRAME - Crunchbase Company Profile & Funding',
      props: {},
      depth: 1,
    },
    {
      id: 'https://www.crunchbase.com/organization/google',
      types: ['schema:Organization'],
      label: 'Google',
      props: {},
      depth: 1,
    },
    {
      id: 'https://www.crunchbase.com/organization/goldman-sachs',
      types: ['schema:Organization'],
      label: 'Goldman Sachs',
      props: {},
      depth: 1,
    },
    {
      id: 'https://www.crunchbase.com/organization/wireline',
      types: ['schema:Organization', 'schema:WebPage'],
      label: 'WIRELINE - Crunchbase Company Profile & Funding',
      props: {},
      depth: 1,
    },
    {
      id: 'https://www.crunchbase.com/organization/d-e-shaw-co',
      types: ['schema:Organization'],
      label: 'D. E. Shaw & Co.',
      props: {},
      depth: 1,
    },
    {
      id: 'https://www.crunchbase.com/organization/the-brain',
      types: ['schema:Organization'],
      label: 'The Brain',
      props: {},
      depth: 1,
    },
    {
      id: 'https://github.com/mykola-vrmchk',
      types: ['schema:Person', 'schema:WebPage'],
      label: 'Mykola Veremchuk',
      props: {
        'schema:dateCreated': ['2018-02-12T19:16:00Z'],
        'schema:identifier': ['mykola-vrmchk'],
      },
      image: 'https://avatars.githubusercontent.com/u/36420699?v=4',
      depth: 2,
    },
    {
      id: 'https://github.com/wittjosiah',
      types: ['schema:Person'],
      label: 'Josiah Witt',
      props: {
        'schema:dateCreated': ['2013-05-25T23:42:46Z'],
        'schema:identifier': ['wittjosiah'],
        'schema:url': ['https://josiahwitt.com'],
      },
      image: 'https://avatars.githubusercontent.com/u/4529818?v=4',
      depth: 2,
    },
  ],
  edges: [
    {
      from: 'https://github.com/richburdon',
      to: 'https://www.linkedin.com/in/richburdon#role-worksFor-dxos-org-0',
      predicate: 'schema:worksFor',
    },
    {
      from: 'https://github.com/richburdon',
      to: 'https://github.com/dxos',
      predicate: 'schema:memberOf',
    },
    {
      from: 'https://github.com/richburdon',
      to: 'https://www.linkedin.com/in/richburdon#role-alumniOf-university-of-sheffield-7',
      predicate: 'schema:alumniOf',
    },
    {
      from: 'https://github.com/richburdon/blog',
      to: 'https://github.com/richburdon',
      predicate: 'schema:author',
    },
    {
      from: 'https://github.com/dxos/dxos',
      to: 'https://github.com/richburdon',
      predicate: 'schema:contributor',
    },
    {
      from: 'https://github.com/richburdon',
      to: 'https://www.crunchbase.com/person/rich-burdon#role-worksFor-braneframe-d6440fb9',
      predicate: 'schema:worksFor',
    },
    {
      from: 'https://github.com/richburdon/gstudio-test',
      to: 'https://github.com/richburdon',
      predicate: 'schema:author',
    },
    {
      from: 'https://github.com/richburdon',
      to: 'https://www.crunchbase.com/person/rich-burdon#role-worksFor-google-1b2e3408',
      predicate: 'schema:worksFor',
    },
    {
      from: 'https://github.com/richburdon/meteor-snowplow',
      to: 'https://github.com/richburdon',
      predicate: 'schema:author',
    },
    {
      from: 'https://github.com/richburdon',
      to: 'https://www.crunchbase.com/person/rich-burdon#role-worksFor-goldman-sachs-05e08dec',
      predicate: 'schema:worksFor',
    },
    {
      from: 'https://github.com/richburdon/sanity-blog',
      to: 'https://github.com/richburdon',
      predicate: 'schema:author',
    },
    {
      from: 'https://github.com/richburdon',
      to: 'https://www.crunchbase.com/person/rich-burdon#role-worksFor-wireline-85525662',
      predicate: 'schema:worksFor',
    },
    {
      from: 'https://github.com/richburdon/dark-proto',
      to: 'https://github.com/richburdon',
      predicate: 'schema:author',
    },
    {
      from: 'https://github.com/richburdon',
      to: 'https://www.crunchbase.com/person/rich-burdon#role-worksFor-d-e-shaw-co-2ccd6588',
      predicate: 'schema:worksFor',
    },
    {
      from: 'https://github.com/richburdon/flask-demo',
      to: 'https://github.com/richburdon',
      predicate: 'schema:author',
    },
    {
      from: 'https://github.com/richburdon',
      to: 'https://www.crunchbase.com/person/rich-burdon#role-worksFor-the-brain-ef99cd67',
      predicate: 'schema:worksFor',
    },
    {
      from: 'https://github.com/richburdon/meteor-base',
      to: 'https://github.com/richburdon',
      predicate: 'schema:author',
    },
    {
      from: 'https://github.com/richburdon',
      to: 'https://www.crunchbase.com/person/rich-burdon#role-worksFor-braneframe-0',
      predicate: 'schema:worksFor',
    },
    {
      from: 'https://github.com/richburdon/webstorm-settings',
      to: 'https://github.com/richburdon',
      predicate: 'schema:author',
    },
    {
      from: 'https://github.com/richburdon/react-json-tree',
      to: 'https://github.com/richburdon',
      predicate: 'schema:author',
    },
    {
      from: 'https://github.com/richburdon/richburdon.github.io',
      to: 'https://github.com/richburdon',
      predicate: 'schema:author',
    },
    {
      from: 'https://github.com/richburdon/nginx-demo',
      to: 'https://github.com/richburdon',
      predicate: 'schema:author',
    },
    {
      from: 'https://github.com/richburdon/dark-zero',
      to: 'https://github.com/richburdon',
      predicate: 'schema:author',
    },
    {
      from: 'https://github.com/richburdon/meteor-demo',
      to: 'https://github.com/richburdon',
      predicate: 'schema:author',
    },
    {
      from: 'https://github.com/richburdon/TestPlatform',
      to: 'https://github.com/richburdon',
      predicate: 'schema:author',
    },
    {
      from: 'https://www.linkedin.com/in/richburdon#role-worksFor-dxos-org-0',
      to: 'https://www.linkedin.com/company/dxos-org',
      predicate: 'schema:worksFor',
    },
    {
      from: 'https://www.linkedin.com/in/richburdon#role-alumniOf-university-of-sheffield-7',
      to: 'https://www.linkedin.com/school/university-of-sheffield',
      predicate: 'schema:alumniOf',
    },
    {
      from: 'https://www.crunchbase.com/person/rich-burdon#role-worksFor-braneframe-d6440fb9',
      to: 'https://www.crunchbase.com/organization/braneframe',
      predicate: 'schema:worksFor',
    },
    {
      from: 'https://www.crunchbase.com/person/rich-burdon#role-worksFor-google-1b2e3408',
      to: 'https://www.crunchbase.com/organization/google',
      predicate: 'schema:worksFor',
    },
    {
      from: 'https://www.crunchbase.com/person/rich-burdon#role-worksFor-goldman-sachs-05e08dec',
      to: 'https://www.crunchbase.com/organization/goldman-sachs',
      predicate: 'schema:worksFor',
    },
    {
      from: 'https://www.crunchbase.com/person/rich-burdon#role-worksFor-wireline-85525662',
      to: 'https://www.crunchbase.com/organization/wireline',
      predicate: 'schema:worksFor',
    },
    {
      from: 'https://www.crunchbase.com/person/rich-burdon#role-worksFor-d-e-shaw-co-2ccd6588',
      to: 'https://www.crunchbase.com/organization/d-e-shaw-co',
      predicate: 'schema:worksFor',
    },
    {
      from: 'https://www.crunchbase.com/person/rich-burdon#role-worksFor-the-brain-ef99cd67',
      to: 'https://www.crunchbase.com/organization/the-brain',
      predicate: 'schema:worksFor',
    },
    {
      from: 'https://www.crunchbase.com/person/rich-burdon#role-worksFor-braneframe-0',
      to: 'https://www.crunchbase.com/organization/braneframe',
      predicate: 'schema:worksFor',
    },
    {
      from: 'https://github.com/dxos/dxos',
      to: 'https://github.com/dxos',
      predicate: 'schema:author',
    },
    {
      from: 'https://github.com/mykola-vrmchk',
      to: 'https://github.com/dxos',
      predicate: 'schema:memberOf',
    },
    {
      from: 'https://github.com/wittjosiah',
      to: 'https://github.com/dxos',
      predicate: 'schema:memberOf',
    },
    {
      from: 'https://github.com/dxos/dxos',
      to: 'https://github.com/mykola-vrmchk',
      predicate: 'schema:contributor',
    },
    {
      from: 'https://github.com/dxos/dxos',
      to: 'https://github.com/wittjosiah',
      predicate: 'schema:contributor',
    },
  ],
  more: {
    'https://github.com/richburdon': 1,
    'https://www.crunchbase.com/organization/braneframe': 1,
    'https://www.crunchbase.com/organization/wireline': 1,
  },
};

/** The root's facts with provenance (`/api/graph/node`), trimmed to 24. */
const rootFacts: NodeFacts = {
  id: 'https://github.com/richburdon',
  facts: [
    {
      predicate: 'schema:image',
      value: 'https://avatars.githubusercontent.com/u/3523355?v=4',
      ref: true,
      from: [
        {
          graph: 'urn:lh:extraction:0fb5a5fc3b7c',
          extractor: 'github.search@0.1.0',
          source: 'https://api.github.com/search/repositories?q=user%3Arichburdon&sort=updated&order=desc&per_page=30',
          at: '2026-10-28T10:41:04.611Z',
        },
        {
          graph: 'urn:lh:extraction:9fda4a059feb',
          extractor: 'github.contributors@0.2.0',
          source: 'https://api.github.com/repos/dxos/dxos/contributors?per_page=100',
          at: '2026-10-28T10:39:57.217Z',
        },
      ],
    },
    {
      predicate: 'schema:memberOf',
      value: 'https://github.com/dxos',
      ref: true,
      from: [
        {
          graph: 'urn:lh:extraction:1263aa4f3d03',
          extractor: 'github.org-members@0.1.0',
          source: 'https://api.github.com/orgs/dxos/public_members?per_page=100',
          at: '2026-10-28T10:39:57.149Z',
        },
        {
          graph: 'urn:lh:extraction:20f8a379164b',
          extractor: 'github.user-orgs@0.1.0',
          source: 'https://api.github.com/users/richburdon/orgs',
          at: '2026-10-28T10:33:43.124Z',
        },
      ],
    },
    {
      predicate: 'rdf:type',
      value: 'schema:Person',
      ref: true,
      from: [
        {
          graph: 'urn:lh:extraction:0fb5a5fc3b7c',
          extractor: 'github.search@0.1.0',
          source: 'https://api.github.com/search/repositories?q=user%3Arichburdon&sort=updated&order=desc&per_page=30',
          at: '2026-10-28T10:41:04.611Z',
        },
        {
          graph: 'urn:lh:extraction:9fda4a059feb',
          extractor: 'github.contributors@0.2.0',
          source: 'https://api.github.com/repos/dxos/dxos/contributors?per_page=100',
          at: '2026-10-28T10:39:57.217Z',
        },
      ],
    },
    {
      predicate: 'rdf:type',
      value: 'schema:WebPage',
      ref: true,
      from: [
        {
          graph: 'urn:lh:extraction:004dff58ecbc',
          extractor: 'duckduckgo.serp@0.1.0',
          source:
            'https://html.duckduckgo.com/html/?q=dxos.org%20team%20Rich%20Burdon%20Josiah%20Witt%20DXOS%20founders&kl=wt-wt',
          at: '2026-10-28T10:40:33.773Z',
        },
        {
          graph: 'urn:lh:extraction:84fd52ce0df3',
          extractor: 'duckduckgo.serp@0.1.0',
          source: 'https://html.duckduckgo.com/html/?q=%22Rich%20Burdon%22%20patent%20inventor&kl=wt-wt',
          at: '2026-10-28T10:36:08.828Z',
        },
      ],
    },
    {
      predicate: 'schema:identifier',
      value: 'richburdon',
      ref: false,
      from: [
        {
          graph: 'urn:lh:extraction:0fb5a5fc3b7c',
          extractor: 'github.search@0.1.0',
          source: 'https://api.github.com/search/repositories?q=user%3Arichburdon&sort=updated&order=desc&per_page=30',
          at: '2026-10-28T10:41:04.611Z',
        },
        {
          graph: 'urn:lh:extraction:9fda4a059feb',
          extractor: 'github.contributors@0.2.0',
          source: 'https://api.github.com/repos/dxos/dxos/contributors?per_page=100',
          at: '2026-10-28T10:39:57.217Z',
        },
      ],
    },
    {
      predicate: 'schema:name',
      value: 'Rich Burdon',
      ref: false,
      from: [
        {
          graph: 'urn:lh:extraction:4a076e0174b1',
          extractor: 'github.org@0.2.0',
          source: 'https://api.github.com/users/richburdon',
          at: '2026-10-28T10:32:36.238Z',
        },
      ],
    },
    {
      predicate: 'schema:name',
      value: 'richburdon (Rich Burdon) · GitHub',
      ref: false,
      from: [
        {
          graph: 'urn:lh:extraction:004dff58ecbc',
          extractor: 'duckduckgo.serp@0.1.0',
          source:
            'https://html.duckduckgo.com/html/?q=dxos.org%20team%20Rich%20Burdon%20Josiah%20Witt%20DXOS%20founders&kl=wt-wt',
          at: '2026-10-28T10:40:33.773Z',
        },
        {
          graph: 'urn:lh:extraction:84fd52ce0df3',
          extractor: 'duckduckgo.serp@0.1.0',
          source: 'https://html.duckduckgo.com/html/?q=%22Rich%20Burdon%22%20patent%20inventor&kl=wt-wt',
          at: '2026-10-28T10:36:08.828Z',
        },
      ],
    },
    {
      predicate: 'schema:url',
      value: 'http://richburdon.com',
      ref: true,
      from: [
        {
          graph: 'urn:lh:extraction:4a076e0174b1',
          extractor: 'github.org@0.2.0',
          source: 'https://api.github.com/users/richburdon',
          at: '2026-10-28T10:32:36.238Z',
        },
      ],
    },
    {
      predicate: 'schema:description',
      value: 'Founder of DXOS.\r\n',
      ref: false,
      from: [
        {
          graph: 'urn:lh:extraction:4a076e0174b1',
          extractor: 'github.org@0.2.0',
          source: 'https://api.github.com/users/richburdon',
          at: '2026-10-28T10:32:36.238Z',
        },
      ],
    },
    {
      predicate: 'schema:location',
      value: 'NYC',
      ref: false,
      from: [
        {
          graph: 'urn:lh:extraction:4a076e0174b1',
          extractor: 'github.org@0.2.0',
          source: 'https://api.github.com/users/richburdon',
          at: '2026-10-28T10:32:36.238Z',
        },
      ],
    },
    {
      predicate: 'schema:dateCreated',
      value: '2013-02-10T06:07:15Z',
      ref: false,
      from: [
        {
          graph: 'urn:lh:extraction:4a076e0174b1',
          extractor: 'github.org@0.2.0',
          source: 'https://api.github.com/users/richburdon',
          at: '2026-10-28T10:32:36.238Z',
        },
      ],
    },
    {
      predicate: 'schema:mentions',
      value: 'https://github.com/richburdon#richburdon',
      ref: true,
      from: [
        {
          graph: 'urn:lh:extraction:5c659cb6a58b',
          extractor: 'clairic.page@0.3.0',
          source: 'https://github.com/richburdon',
          at: '2026-10-28T10:34:07.091Z',
        },
        {
          graph: 'urn:lh:extraction:dafa074a26b1',
          extractor: 'clairic.page@0.3.0',
          source: 'https://github.com/richburdon',
          at: '2026-10-28T09:22:56.882Z',
        },
      ],
    },
  ],
};

export const nodeFactsFixture = (iri: string): NodeFacts => (iri === rootFacts.id ? rootFacts : { id: iri, facts: [] });
