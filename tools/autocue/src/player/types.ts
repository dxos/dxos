//
// Copyright 2026 DXOS.org
//

/**
 * The autocue bundle manifest (`autocue@1`), written by `.agents/skills/autocue/scripts/pack.mjs` and specified in
 * `.agents/skills/autocue/FORMAT.md`. Paths are relative to the bundle root unless they are absolute URLs.
 */
export type Manifest = {
  format: 'autocue@1';
  title: string;
  created?: string;
  /** Where the bundle is hosted, when it was uploaded; links that must leave an Artifact use it. */
  hosted?: string;
  /** The whole bundle as one archive. */
  archive?: string;
  demos: Demo[];
};

export type Demo = {
  /** The page's `#hash` for this demo. */
  id: string;
  title: string;
  description?: string;
  /** Seconds. */
  duration?: number;
  narrated?: boolean;
  videos: VideoSource[];
  poster?: string;
  chapters: Chapter[];
  recording: Recording;
  script?: Script;
  spec?: Spec;
  prompt?: string;
};

export type VideoSource = { src: string; type?: string };

export type Chapter = {
  /** Seconds on the bundled video's clock. */
  at: number;
  end?: number;
  title: string;
  subtitle?: string;
};

export type Recording = {
  recordedAt?: string;
  target?: string;
  git?: { branch?: string; commit?: string; dirty?: boolean; remote?: string };
  /** Repo-relative path of the committed flow. */
  flow?: string;
  composer?: Environment & { version?: string };
  edge?: Environment;
  title?: string;
  description?: string;
  mdl?: string;
  app?: string;
  template?: string;
};

export type Environment = { url?: string; environment?: string };

export type Script = { path: string; file?: string; source: string };

/** The `.mdl` test the flow was written from, as source lines with each step's span. */
export type Spec = {
  /** Repo-relative path of the `.mdl` file. */
  path: string;
  /** The test's id, e.g. `QA-1`. */
  test: string;
  /** 1-based line number of `lines[0]` in the file. */
  line: number;
  lines: string[];
  steps: SpecStep[];
};

export type SpecStep = {
  name: string;
  /** Index into `lines` of the step's first and last line. */
  start: number;
  end: number;
  /** The chapter this step was recorded as, when the take ran it on camera. */
  chapter?: number;
};
