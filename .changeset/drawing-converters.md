---
'@dxos/plugin-illustrator': minor
---

`DrawingOperation.Convert` converts into a new drawing beside the source by default, leaving it as it is; `replace: true` converts in place, as drawing.sh does. Plugins can register an `IllustratorCapabilities.Converter` for a pair of variants, which `Convert` uses over the generic scene replay (`convertByScene`); its output now names the converted drawing. Composer's menu offers "Copy as …" for each variant.
