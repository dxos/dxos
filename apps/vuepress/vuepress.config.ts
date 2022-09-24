//
// Copyright 2022 DXOS.org
//

import frontMatter from 'front-matter';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { defaultTheme, defineUserConfig, SidebarGroupCollapsible, SidebarItem, UserConfig } from 'vuepress';

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

const sidebar = () => readdirSync(join(__dirname, '/docs'))
  .filter(area => !area.includes('.'))
  .reduce((sidebar, area) => {
    const areaSidebar = readdirSync(join(__dirname, 'docs', area))
      .map((section): [number, SidebarGroupCollapsible | SidebarItem | string] => {
        if (section.endsWith('.md')) {
          return parseFrontMatter(join(area, section));
        }

        const sectionInfo = JSON.parse(
          readFileSync(join(__dirname, 'docs', area, section, '_category_.json'), 'utf-8')
        );

        const children = readdirSync(join(__dirname, 'docs', area, section))
          .filter(page => page.endsWith('.md'))
          .map(page => parseFrontMatter(join(area, section, page)))
          .sort(([a], [b]) => a - b)
          .map(([, page]) => page);

        return [sectionInfo.position, {
          text: sectionInfo.label,
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
  })
});

export default config;
