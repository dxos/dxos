//
// Copyright 2022 DXOS.org
//

import { searchPlugin } from '@vuepress/plugin-search';
import frontMatter from 'front-matter';
import { existsSync, lstatSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { defaultTheme, defineUserConfig, SidebarGroupCollapsible, SidebarItem, UserConfig } from 'vuepress';

const DOCS_PATH = join(__dirname, '/docs');

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

const sidebar = () => readdirSync(DOCS_PATH)
  .filter(area => !area.includes('.'))
  .reduce((sidebar, area) => {

    return {
      ...sidebar,
      [`/${area}`]: sidebarSection(join(__dirname, 'docs', area))
    };
  }, {});

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
    // TODO(wittjosiah): Generate navbar dropdown for API docs.
    navbar: [
      {
        text: 'Guide',
        link: '/guide'
      },
      {
        text: 'Reference',
        link: '/api'
      },
      {
        text: 'Github',
        link: 'https://github.com/dxos/dxos'
      }
    ],
    sidebar: sidebar()
  }),
  plugins: [
    // Config: https://vuepress.github.io/reference/plugin/search.html
    searchPlugin()
    // TODO(wittjosiah): Match Zhena's desired tree shape for API docs. See typedoc-plugin-markdown.
    // TODO(wittjosiah): Can these link to each other?
    // typedocPlugin({
    //   entryPoints: ['../../packages/echo/echo-db/src/index.ts'],
    //   tsconfig: '../../packages/echo/echo-db/tsconfig.json',
    //   out: 'api/echo-db'
    // }),
    // typedocPlugin({
    //   entryPoints: ['../../packages/echo/echo-protocol/src/index.ts'],
    //   tsconfig: '../../packages/echo/echo-protocol/tsconfig.json',
    //   out: 'api/echo-protocol'
    // })
    // Typedoc Config: https://typedoc.org/guides/options
    // Plugin Config: https://github.com/tgreyuk/typedoc-plugin-markdown/tree/master/packages/vuepress-plugin-typedoc#options
    // TODO(wittjosiah): This strategy doesn't work well because it bunches everything together.
    //   Might work if we fork the plugin and make it output the md files in a different structure based on the typedoc data?
    // TODO(wittjosiah): Running typedoc on everything is slooooow (~300s), also runs out of memory sometimes.
    //   Can we take advantage of Nx cache to skip generation when nothing has changed?
    // typedocPlugin({
    //   entryPoints: [
    //     '../../packages/echo/*',
    //     '../../packages/halo/*',
    //     '../../packages/mesh/*',
    //     '../../packages/sdk/*'
    //   ],
    //   tsconfig: '../../tsconfig.json',
    //   entryPointStrategy: 'packages'
    // })
  ]
});

export default config;
