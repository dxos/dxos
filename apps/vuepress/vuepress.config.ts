//
// Copyright 2022 DXOS.org
//

import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { defaultTheme, defineUserConfig, SidebarGroupCollapsible, UserConfig } from 'vuepress';

const sidebar = () => readdirSync(join(__dirname, '/docs'))
  .filter(area => !area.includes('.'))
  .reduce((sidebar, area) => {
    const areaSidebar = readdirSync(join(__dirname, 'docs', area))
      .map((section): [number, SidebarGroupCollapsible | string] => {
        if (section.endsWith('.md')) {
          return [0, `/${area}/${section}`];
        }

        const sectionInfo = JSON.parse(
          readFileSync(join(__dirname, 'docs', area, section, '_category_.json'), 'utf-8')
        );

        const children = readdirSync(join(__dirname, 'docs', area, section))
          .filter(page => page.endsWith('.md'))
          .map(page => `/${area}/${section}/${page}`);

        return [sectionInfo.position, {
          text: sectionInfo.label,
          collapsible: true,
          children
        }];
      })
      .sort(([a], [b]) => a - b)
      .map(([, section]) => section);

    console.log({ areaSidebar });

    return {
      ...sidebar,
      [`/${area}`]: areaSidebar
    };
  }, {});

const config: UserConfig = defineUserConfig({
  lang: 'en-US',
  title: 'DXOS',
  description: 'The Decentralized Operation System',
  theme: defaultTheme({
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
