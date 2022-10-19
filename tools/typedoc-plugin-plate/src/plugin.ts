import { Application, ParameterType, Renderer } from "typedoc";
import { Options, OptionsReader } from 'typedoc';
import { Theme } from "./theme";

export class ForceThemeOptionsReader implements OptionsReader {
  priority = 1000;
  name = 'plate-force-theme-options-reader';
  read(container: Options) {
    if (container.getValue('theme') === 'default') {
      container.setValue('theme', 'plate');
    }
  }
}
export const load = (app: Application) => {
  app.renderer.defineTheme('plate', Theme as any);
  app.options.addReader(new ForceThemeOptionsReader());

  // app.options.addDeclaration({
  //   help: '[Markdown Plugin] Do not render page title.',
  //   name: 'hidePageTitle',
  //   type: ParameterType.Boolean,
  //   defaultValue: false,
  // });
}