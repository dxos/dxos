import { SubstitutionsMap } from "../parser";

export interface GeneratorContext {
  outputFilename: string
  subs: SubstitutionsMap
}