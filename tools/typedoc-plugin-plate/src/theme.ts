import {
  Theme as ThemeBase,
  Renderer,
  PageEvent,
  RendererEvent,
  Reflection,
  UrlMapping,
  ProjectReflection,
} from "typedoc";

export class Theme extends ThemeBase {
  constructor(renderer: Renderer) {
    super(renderer);
    // this.listenTo(this.owner, {
    //   [RendererEvent.BEGIN]: this.onBeginRenderer,
    //   [PageEvent.BEGIN]: this.onBeginPage,
    // });
  }

  render(page: PageEvent<Reflection>): string {
    const content = page.template(page) as string;
    return (
      content.replace(/[\r\n]{3,}/g, "\n\n").replace(/^\s+|\s+$/g, "") + "\n"
    );
  }

  // onBeginPage() {}

  // onBeginRenderer() {}

  getUrls(project: ProjectReflection) {
    const urls: UrlMapping[] = [];
    return [
      new UrlMapping(".", project, (data) => JSON.stringify(data, null, 2)),
    ];
  }
}
