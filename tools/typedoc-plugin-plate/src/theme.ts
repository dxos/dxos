/**
 * api
 *   package
 *     README.md (beast diagrams)
 *       - classes
 *         README.md (beast for all classes ?!)
 *         + Class.md (beast?)
 *       - functions
 *       - enums
 *       - interfaces
 *       - types
 *       - ...
 */

import {
  Theme as ThemeBase,
  Renderer,
  PageEvent,
  RendererEvent,
  Reflection,
  UrlMapping,
  ProjectReflection,
} from "typedoc";

import { executeDirectoryTemplate } from "@dxos/plate";
import path from "path";

import { Input } from "./template/api";

export class Theme extends ThemeBase {
  private renderer: Renderer;
  constructor(renderer: Renderer) {
    super(renderer);
    this.renderer = renderer;
    // this.listenTo(this.owner, {
    //   [RendererEvent.BEGIN]: this.onBeginRenderer,
    //   [PageEvent.BEGIN]: this.onBeginPage,
    // });
  }

  render(page: PageEvent<Reflection>): string {
    const content = (page.template(page) as string) ?? "";
    return (
      content.replace(/[\r\n]{3,}/g, "\n\n").replace(/^\s+|\s+$/g, "") + "\n"
    );
  }

  // onBeginPage() {}

  // onBeginRenderer() {}

  async getUrls(project: ProjectReflection) {
    const files = await executeDirectoryTemplate<Input>({
      templateDirectory: path.resolve(__dirname, "template/api"),
      outputDirectory: "",
      input: {
        project,
      },
    });

    // because some files are copies of others, load all files into .content
    await Promise.all(
      files.filter((file) => !file.isLoaded()).map((file) => file.load())
    );

    console.log(files.map((file) => file.shortDescription()).join("\n"));

    return files.map(
      (file) => new UrlMapping(file.path, project, () => file.content as string)
    );
  }
}
