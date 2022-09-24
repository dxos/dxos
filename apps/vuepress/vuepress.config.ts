//
// Copyright 2022 DXOS.org
//

import { searchPlugin } from '@vuepress/plugin-search';
import frontMatter from 'front-matter';
import { existsSync, lstatSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { defaultTheme, defineUserConfig, SidebarGroupCollapsible, SidebarItem, UserConfig } from 'vuepress';

const DOCS_PATH = join(__dirname, '/docs');
const PINNED_PACKAGES = [
  '@dxos/client',
  '@dxos/react-client'
];

const parseFrontMatter = (path: string): [number, SidebarItem | string] => {
  const content = readFileSync(path, 'utf-8');
  const { attributes } = frontMatter<{ position: number, label: string }>(content);
  const link = path.slice(DOCS_PATH.length);
  const item = attributes.label ? {
    text: attributes.label,
    link
  } : link;

  return [attributes.position, item];
};

type SidebarObject = SidebarGroupCollapsible | SidebarItem | string
type NumberedSidebarObject = [number, SidebarObject]

const sidebarSection = (path: string) => readdirSync(path)
  .map((file): NumberedSidebarObject | null => {
    const filePath = join(path, file);
    if (file.endsWith('.md')) {
      return parseFrontMatter(filePath);
    }

    if (!lstatSync(filePath).isDirectory()) {
      return null;
    }

    const infoPath = join(path, file, '_category_.json');
    const sectionInfo = existsSync(infoPath) ? JSON.parse(readFileSync(infoPath, 'utf-8')) : {};
    const children = sidebarSection(filePath);

    return [sectionInfo.position, {
      text: sectionInfo.label ?? file,
      collapsible: true,
      children
    }];
  })
  .filter((section): section is NumberedSidebarObject => !!section)
  .sort(([a], [b]) => a - b)
  .map(([, section]) => section);

const groupByModule = (list: string[]) => list.reduce<{ [key: string]: string[] }>((grouped, item) => {
  const [module, entity] = item.split('.');

  return {
    ...grouped,
    [module]: [...(grouped[module] ?? []), entity]
  };
}, {});

const apiSidebar = () => {
  const apiPath = join(__dirname, 'docs', 'api');

  const interfaceLookup = groupByModule(
    readdirSync(join(apiPath, 'interfaces')).filter(interfaceFile => !interfaceFile.includes('defs'))
  );

  const enumLookup = groupByModule(
    readdirSync(join(apiPath, 'enums')).filter(enumFile => !enumFile.includes('defs'))
  );

  const classLookup = groupByModule(
    readdirSync(join(apiPath, 'classes')).filter(classFile => !classFile.includes('defs'))
  );

  const createChildren = (dir: string, module: string, entities: string[] | undefined) => entities?.map(entity => ({
    text: entity,
    link: `/api/${dir}/${module}.${entity}.md`
  }));

  const modules = readdirSync(join(apiPath, 'modules'))
    // TODO(wittjosiah): Don't generate these.
    .filter(module => !module.includes('defs'))
    .filter(module => !module.includes('definitions'))
    .map((module): SidebarGroupCollapsible => {
      const key = module.split('.md')[0];
      const packageName = `@dxos/${key.slice(5).replaceAll('_', '-')}`;

      const interfaces = createChildren('interfaces', key, interfaceLookup[key]);
      const enums = createChildren('enums', key, enumLookup[key]);
      const classes = createChildren('classes', key, classLookup[key]);
      const children = [
        {
          text: 'Package',
          link: `/api/modules/${module}`
        },
        ...(interfaces ? [{
          text: 'Interfaces',
          collapsible: true,
          children: interfaces
        }] : []),
        ...(enums ? [{
          text: 'Enums',
          collapsible: true,
          children: enums
        }] : []),
        ...(classes ? [{
          text: 'Classes',
          collapsible: true,
          children: classes
        }] : [])
      ];

      return {
        text: packageName,
        collapsible: true,
        children
      };
    });

  return [
    ...PINNED_PACKAGES.map(pinned => modules.find(({ text }) => text === pinned)),
    ...modules.filter(({ text }) => !PINNED_PACKAGES.includes(text))
  ].filter((module): module is SidebarGroupCollapsible => !!module);
};

// Config: https://vuepress.github.io/reference/config.html
const config: UserConfig = defineUserConfig({
  title: 'DXOS',
  description: 'DXOS is an Operating System for Decentralized Software',
  // Config: https://vuepress.github.io/reference/default-theme/config.html
  theme: defaultTheme({
    logo: '/images/dxos.svg',
    logoDark: '/images/dxos-white.svg',
    docsRepo: 'dxos/dxos',
    docsBranch: 'wittjosiah/09-23-docs_Vuepress',
    docsDir: 'apps/vuepress/docs',
    navbar: [
      {
        text: 'Guide',
        link: '/guide'
      },
      {
        text: 'Reference',
        children: PINNED_PACKAGES.map(text => {
          const [, module] = text.split('/');

          return {
            text,
            link: `/api/modules/dxos_${module.replaceAll('-', '_')}.md`
          };
        })
      },
      {
        text: 'Github',
        link: 'https://github.com/dxos/dxos'
      }
    ],
    sidebar: {
      '/guide': sidebarSection(join(__dirname, 'docs', 'guide')),
      '/api': apiSidebar()
    }
  }),
  plugins: [
    // Config: https://vuepress.github.io/reference/plugin/search.html
    searchPlugin()
  ]
});

export default config;
