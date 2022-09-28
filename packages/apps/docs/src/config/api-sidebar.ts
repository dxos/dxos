//
// Copyright 2022 DXOS.org
//

import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { SidebarGroupCollapsible } from 'vuepress';

import { API_SECTIONS, DOCS_PATH, PINNED_PACKAGES } from '../constants';

const groupByModule = (list: string[]) => list.reduce<{ [key: string]: string[] }>((grouped, item) => {
  const [module, entity] = item.split('.');

  return {
    ...grouped,
    [module]: [...(grouped[module] ?? []), entity]
  };
}, {});

export const moduleToPackage = (module: string) =>
  `@dxos/${module.slice(5, -3).replaceAll('_', '-')}`;

export const packageToModule = (packageName: string) =>
  `dxos_${packageName.split('/')[1].replaceAll('-', '_')}.md`;

export const apiSidebar = () => {
  const apiPath = join(DOCS_PATH, 'api');

  const lookupTable: { [key: string]: { [key: string]: string[] } } =
    API_SECTIONS.reduce((lookup, [folder]) => ({
      ...lookup,
      [folder]: groupByModule(
        readdirSync(join(apiPath, folder))
          .filter(interfaceFile => !interfaceFile.includes('defs'))
      )
    }), {});

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
      const packageName = moduleToPackage(module);

      const children = [
        {
          text: 'Package',
          link: `/api/modules/${module}`
        },
        ...API_SECTIONS
          .map(([folder, text]) => ({
            text,
            collapsible: true,
            children: createChildren(folder, key, lookupTable[folder][key])
          }))
          .filter(({ children }) => Boolean(children))
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
