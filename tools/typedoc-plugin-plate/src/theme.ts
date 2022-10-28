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

//
// Copyright 2022 DXOS.org
//

import { Theme as ThemeBase, Renderer, PageEvent, RendererEvent, Reflection, ProjectReflection } from 'typedoc';

export class Theme extends ThemeBase {
  private renderer: Renderer;
  private outputDirectory: string;
  constructor(renderer: Renderer) {
    super(renderer);
    this.renderer = renderer;
    this.outputDirectory = '';
    this.listenTo(this.owner, {
      [RendererEvent.BEGIN]: this.onBeginRenderer
    });
  }

  render(page: PageEvent<Reflection>): string {
    const content = (page.template(page) as string) ?? '';
    return content.replace(/[\r\n]{3,}/g, '\n\n').replace(/^\s+|\s+$/g, '') + '\n';
  }

  onBeginRenderer(event: RendererEvent) {
    this.outputDirectory = event.outputDirectory;
  }

  /**
   * This should return the output file mappings but doesnt work well with our plate package because typedoc does not allow this to be async. a pnpm patch can work but is annoying.
   * @param project the project reflection
   * @returns a list of UrlMappings (or a promise of this)
   */
  getUrls(project: ProjectReflection) {
    return [];
    // const files = await executeDirectoryTemplate<Input>({
    //   templateDirectory: path.resolve(__dirname, "template/api"),
    //   outputDirectory: this.outputDirectory,
    //   input: {
    //     project,
    //   },
    // });

    // // because some files are copies of others, load all files into .content
    // await Promise.all(
    //   files.filter((file) => !file.isLoaded()).map((file) => file.load())
    // );

    // console.log(files.map((file) => file.shortDescription()).join("\n"));

    // return files.map(
    //   (file) => new UrlMapping(file.path, project, () => file.content as string)
    // );
  }
}
