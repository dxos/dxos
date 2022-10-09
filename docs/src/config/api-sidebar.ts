import { SidebarItem, SidebarGroup, SidebarGroupCollapsible } from "vuepress";
import { promises as fs, stat } from "node:fs";
import path from "path";
import { API_SECTIONS, PINNED_PACKAGES } from "../constants";
import { capitalCase } from "change-case";

const apiPath = path.resolve(__dirname, "../../docs/api");

export const link = {
  package: (name: string) => `/api/${name}`,
  class: (pkg: string, name: string) => `/api/${pkg}/classes/${name}`,
};

type AnySidebarItem = SidebarItem | SidebarGroup | SidebarGroupCollapsible;
type MaybePromise<T> = T | Promise<T>;

const isMarkdown = (file: string) => /\.md$/.test(file);

const dirExists = async (path: string) => {
  try {
    const stats = await fs.stat(path);
    if (!stats.isDirectory()) return false;
    return true;
  } catch (err) {
    return false;
  }
};

const fileName = (name: string) => path.parse(name)?.name;

const sidebarItem: {
  [k: string]: (...args: any[]) => MaybePromise<AnySidebarItem>;
} = {
  async package(pkg: string) {
    return {
      text: pkg,
      link: link.package(pkg),
      collapsible: true,
      children: [
        ...(
          await Promise.all(
            API_SECTIONS.map(async (section) =>
              (await dirExists(path.resolve(apiPath, pkg, section)))
                ? {
                    text: capitalCase(section),
                    collapsible: true,
                    children: (
                      await fs.readdir(path.resolve(apiPath, pkg, section))
                    )
                      .filter(isMarkdown)
                      .map((file) => ({
                        text: fileName(file),
                        link: link.class(pkg, fileName(file)),
                      })),
                  } as AnySidebarItem
                : null
            )
          )
        ).filter((s) => s),
      ],
    };
  },
};

export const apiSidebar = async (): Promise<AnySidebarItem[]> => {
  const allscopes = (await fs.readdir(apiPath, { withFileTypes: true })).filter(
    (s) => /^@/.test(s.name) && s.isDirectory()
  );
  const packagesByScope = await Promise.all(
    allscopes.map(async (scope) => {
      const dircontents = await fs.readdir(path.resolve(apiPath, scope.name), {
        withFileTypes: true,
      });
      const folders = dircontents.filter((entry) => entry.isDirectory());
      return folders.map((pkg) => `${scope.name}/${pkg.name}`);
    })
  );
  const flatPackages = packagesByScope.flat();
  const otherPackages = flatPackages.filter(
    (p) => !PINNED_PACKAGES.includes(p)
  );
  return [
    ...(await Promise.all(PINNED_PACKAGES.map(sidebarItem.package))),
    {
      text: "Other packages",
      collapsible: true,
      children: await Promise.all(otherPackages.map(sidebarItem.package)),
    },
  ];
};
