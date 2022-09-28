//
// Copyright 2022 DXOS.org
//

import frontMatter from 'front-matter';
import { existsSync, lstatSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SidebarGroupCollapsible, SidebarItem } from 'vuepress';

import { DOCS_PATH } from '../constants';

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

export const sidebarSection = (path: string) => readdirSync(path)
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
