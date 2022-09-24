//
// Copyright 2022 DXOS.org
//

import frontMatter from 'front-matter';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { defaultTheme, defineUserConfig, SidebarGroupCollapsible, SidebarItem, UserConfig } from 'vuepress';
import { typedocPlugin } from 'vuepress-plugin-typedoc/next';

const parseFrontMatter = (path: string): [number, SidebarItem | string] => {
  const content = readFileSync(join(__dirname, 'docs', path), 'utf-8');
  const { attributes } = frontMatter<{ position: number, label: string }>(content);
  const link = `/${path}`;
  const item = attributes.label ? {
    text: attributes.label,
    link
  } : link;

  return [attributes.position, item];
};

// TODO(wittjosiah): Make recursive and see what it looks like in the UI.
// TODO(wittjosiah): Match Zhena's desired tree shape for API docs.
// TODO(wittjosiah): Generate navbar dropdown for API docs.
const sidebar = () => readdirSync(join(__dirname, '/docs'))
  .filter(area => !area.includes('.'))
  .reduce((sidebar, area) => {
    const areaSidebar = readdirSync(join(__dirname, 'docs', area))
      .map((section): [number, SidebarGroupCollapsible | SidebarItem | string] => {
        if (section.endsWith('.md')) {
          return parseFrontMatter(join(area, section));
        }

        const infoPath = join(__dirname, 'docs', area, section, '_category_.json');
        const sectionInfo = existsSync(infoPath) ? JSON.parse(readFileSync(infoPath, 'utf-8')) : {};

        const children = readdirSync(join(__dirname, 'docs', area, section))
          .filter(page => page.endsWith('.md'))
          .map(page => parseFrontMatter(join(area, section, page)))
          .sort(([a], [b]) => a - b)
          .map(([, page]) => page);

        return [sectionInfo.position, {
          text: sectionInfo.label ?? section,
          collapsible: true,
          children
        }];
      })
      .sort(([a], [b]) => a - b)
      .map(([, section]) => section);

    return {
      ...sidebar,
      [`/${area}`]: areaSidebar
    };
  }, {});

const config: UserConfig = defineUserConfig({
  title: 'DXOS',
  description: 'DXOS is an Operating System for Decentralized Software',
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
        text: 'Github',
        link: 'https://github.com/dxos/dxos'
      }
    ],
    sidebar: sidebar()
  }),
  plugins: [
    // TODO(wittjosiah): Can these link to each other?
    typedocPlugin({
      entryPoints: ['../../packages/echo/echo-db/src/index.ts'],
      tsconfig: '../../packages/echo/echo-db/tsconfig.json',
      out: 'api/echo-db'
    }),
    typedocPlugin({
      entryPoints: ['../../packages/echo/echo-protocol/src/index.ts'],
      tsconfig: '../../packages/echo/echo-protocol/tsconfig.json',
      out: 'api/echo-protocol'
    })
    // TODO(wittjosiah): This strategy doesn't work because it bunches everything together.
    //   Might work if we fork the plugin and make it output the md files in a different structure based on the typedoc data?
    // typedocPlugin({
    //   entryPoints: ['../../packages/echo/*'],
    //   tsconfig: '../../tsconfig.json',
    //   entryPointStrategy: 'packages'
    // })
  ]
});

export default config;
