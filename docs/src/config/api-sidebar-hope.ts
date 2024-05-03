//
// Copyright 2022 DXOS.org
//

import { capitalCase } from 'change-case';
import matter from 'gray-matter';
import { promises as fs } from 'node:fs';
import path from 'path';
import { type SidebarItem } from 'vuepress-theme-hope';

import { API_SECTIONS, PINNED_PACKAGES, API_PACKAGE_IGNORE } from '../constants';

const apiPath = path.resolve(__dirname, '../../content/api');

export const link = {
  package: (name: string) => `/api/${name}`,
  sectionItem: (pkg: string, section: string, name: string) => `${link.package(pkg)}/${section}/${name}`,
  packageItem: (name: string, item: string) => path.join(link.package(name), item),
};

type AnySidebarItem = SidebarItem;
type MaybePromise<T> = T | Promise<T>;

const isMarkdown = (file: string) => /\.md$/.test(file);

const dirExists = async (path: string) => {
  try {
    const stats = await fs.stat(path);
    if (!stats.isDirectory()) {
      return false;
    }
    return true;
  } catch (err) {
    return false;
  }
};

const fileName = (name: string) => path.parse(name)?.name;

const sidebarItem: {
  [k: string]: (...args: any[]) => MaybePromise<AnySidebarItem>;
} = {
  package: async (pkg: string) => ({
    text: pkg,
    link: link.package(pkg),
    collapsible: true,
    children: [
      ...(
        await Promise.all(
          API_SECTIONS.map(async (section) =>
            (await dirExists(path.resolve(apiPath, pkg, section)))
              ? ({
                  text: capitalCase(section),
                  collapsible: true,
                  children: (await fs.readdir(path.resolve(apiPath, pkg, section))).filter(isMarkdown).map((file) => ({
                    text: fileName(file),
                    link: link.sectionItem(pkg, section, fileName(file)),
                  })),
                } as AnySidebarItem)
              : null,
          ),
        )
      ).filter((s) => s),
      ...(await Promise.all(
        (await fs.readdir(path.resolve(apiPath, pkg)))
          .filter((file) => {
            if ([...API_SECTIONS, ...API_PACKAGE_IGNORE].indexOf(file) >= 0) {
              return false;
            }

            return /\.md$/.test(file);
          })
          .map(async (file) => {
            const filecontents = (await fs.readFile(path.resolve(apiPath, pkg, file))).toString();
            const matters = matter(filecontents);
            return {
              text: matters?.data?.title ?? file,
              link: link.packageItem(pkg, file),
            };
          }),
      )),
    ],
  }),
};

export const apiSidebar = async (): Promise<AnySidebarItem[]> => {
  const allscopes = (await fs.readdir(apiPath, { withFileTypes: true })).filter(
    (s) => /^@/.test(s.name) && s.isDirectory(),
  );
  const packagesByScope = await Promise.all(
    allscopes.map(async (scope) => {
      const dircontents = await fs.readdir(path.resolve(apiPath, scope.name), {
        withFileTypes: true,
      });
      const folders = dircontents.filter((entry) => entry.isDirectory());
      return folders.map((pkg) => `${scope.name}/${pkg.name}`);
    }),
  );
  const flatPackages = packagesByScope.flat();
  const otherPackages = flatPackages.filter((p) => !!p && !PINNED_PACKAGES.includes(p));
  return [
    ...(await Promise.all(PINNED_PACKAGES.map(sidebarItem.package))),
    ...(otherPackages?.length
      ? [
          {
            text: 'Other packages',
            collapsible: true,
            children: await Promise.all(otherPackages.map(sidebarItem.package)),
          },
        ]
      : []),
  ];
};
