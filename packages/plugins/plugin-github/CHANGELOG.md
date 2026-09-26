# @dxos/plugin-github

## 0.12.0

### Minor Changes

- ee13bbd: Add an "Import pull request" command that takes a github.com link or `owner/repo#number`, files the pull request in the active space and opens it — no repository sync required. The review article's subject is now the pull request itself rather than its walkthrough, so one that has not been narrated yet still opens, with a "Generate walkthrough" action on its toolbar; where a walkthrough exists it renders as before and the action regenerates it.
- 8f372ce: Add an `AppSurface.CardMenu` role and `CardMenuSlot`, so plugins can contribute items to a card header's menu. A pull request card's menu now offers "Open walkthrough", or "Generate walkthrough" when there is none yet. The walkthrough article shows the pull request's number, state and CI status, and can approve the pull request, post a comment, comment on a single diff line (`diffBlocks({ onLineComment })`) or copy its link. `AnchorWidget` accepts a leading icon, which pull request link chips use.
- f962a7d: Add a `Repo` type (a host-agnostic source repository, with provenance carried by foreign keys) and `Project.repo` naming the repository a project's work lands in. `#123` in markdown now decorates as a link to the issue or pull request, contributed by `@dxos/plugin-github` and resolved against the owning project's repository, then the repository its task set mirrors, then the single repository a space mirrors; a space with none or several leaves the text alone. The outline accepts host-contributed editor extensions so a plugin's decoration can reach it, and `hashtag()` no longer claims a bare number.

  The task list renders a task's description as markdown on its own row, marks the selected row, keeps its create row on screen, and reveals the delete affordance on hover or keyboard focus only. `Popover.Arrow` renders again: the popover content clipped its own overflow, and Radix positions the arrow as a child of that content straddling its edge, so clipping moved to `Popover.Viewport`.

- b2a44d6: Cards and dialogs each sit one level lower on the surface ladder: a card takes the canvas's `base` level and a dialog (with sheets and drawers) the `raised` level, so both read darker in the dark theme and closer to the canvas in the light one. The `elevation` prop's explicit levels are unchanged, and `Select`'s list moves to the popup level with menus rather than following dialogs down.

  The editor's widget machinery is split from what it matches. `widgets` owns the decoration field, the portal lifecycle (`widgetHost({ setWidgets, bookmarks })`), the `widgetContextEffect`/`widgetResetEffect`/`widgetUpdateEffect` effects and bookmark navigation; `xmlTags({ registry })` is the XML element matcher and `linkWidgets({ match, link, image })` the markdown link matcher, with `matchSchemes`, `matchHosts` and `matchPattern` to build a `(url) => boolean`. `objectLinks()` is the `dxn:`/`echo:` case with the anchor chip as its default inline widget and an optional block `image` widget; the `urlSchemes` field on a registry entry and the shared `xmlWidgetRegistry` are gone, and `XmlWidgetProps`/`XmlWidgetState`/`xmlTag*Effect` are `WidgetProps`/`WidgetState`/`widget*Effect`. A host composes `[widgetHost(…), xmlTags(…), objectLinks(…)]` instead of passing `setWidgets` to `xmlTags`. A plugin contributes its own matcher the same way: plugin-github's `githubLinks({ trigger, link })` turns repository, pull-request and issue URLs into anchor chips, contributed through `MarkdownCapabilities.ExtensionProvider`. The popover's lookup is now an extension point too: plugin-preview's `PreviewCapabilities.LinkResolver` is a multi capability each plugin answers for its own kind of link (the ECHO entity resolver is plugin-preview's own contribution), and plugin-github resolves a GitHub URL to an in-memory `Repo`, `PullRequest` or `Issue` — the latter two new host-agnostic types in `@dxos/types` beside `Repo` — fetched from the GitHub API with the space's connection token (anonymously without one) unless a host contributes a `GitHubCapabilities.LinkSource`. `GitHubCard` is the `CardContent` surface for all three, so the deck popover shows the PR or issue with no further wiring. The anchor chain names what it carries: `<dx-anchor eid>` (was `dxn`), `DxAnchorActivate.eid`, `PreviewLinkRef.eid` and `ObjectLinkProps.eid` hold an ECHO entity URI (`echo:///<id>`), and the legacy single-slash `echo:/<id>` spelling is retired from stories, tests and comments in favour of the canonical triple-slash form. A task's description takes the same contributions: `MarkdownEditable` and `TaskList.Edit` accept host extensions, and the task-set article passes what `MarkdownCapabilities.ExtensionProvider` contributes, so a GitHub URL in a description is a chip while editing. plugin-github's provider no longer needs a document for the URL matcher; only the bare `#123` decoration does.

- 98f7886: Walkthroughs of large pull requests are now planned into chapters and written a chapter at a time, so a change too big for one prompt is described rather than left to the appended diff. Lockfiles, build output and binaries are detected and named instead of rendered, and the prompt spends its budget on code instead.
- 78433b0: Walkthroughs: a pull request narrated as ONE markdown document, whose prose, headings and ```diff
  fences read as a single narrative.

  `diffBlocks()` claims a fence whose info line starts with `diff` and renders it as a diff chunk. The
  info line carries the review metadata: ` ```diff file=src/index.ts lines=66-99 lang=typescript `.
  Layout is `split`, `inline`, or `auto` (the default), which measures the block and falls back to a
  unified column in a narrow pane; code is syntax-highlighted by loading the language lazily.
  `walkthroughSidebar()` is a separate extension over the same reading of the document: a rail of
  sections with the files each touches and their change counts, with `walkthroughOutline()` exposing
  the same data to a host that would rather render its own panel.

  This is not `@codemirror/merge`: both of its views take the whole document as one side of one diff,
  which cannot express a document that is mostly prose with diffs embedded in it.

  `GenerateWalkthrough` produces such a document from a pull request. It fetches the pull request and
  its diff, has the model narrate the change in reading order, and stores a `Walkthrough` object
  holding the body as a plain string, the commit it was generated against, and a ref to the
  `PullRequest`. It is idempotent by commit unless `force` is set, and reports progress under a key
  derived from the pull request.

  The model never writes diff content: it emits empty fences naming a path and a line range, and a
  postprocess splices the real hunks in from the patch, then appends every hunk the prose did not
  claim. The artefact therefore always accounts for the whole change even when the model's reading of
  it is partial.

### Patch Changes

- 106d38a: Fix type-safety and synchronization issues found by an automated code review, including a shape-compatibility encoding bug that could silently drop a selected oneof field.
- 2443867: Open a GitHub pull request in Composer from the browser extension: a `plugin-crx` page action on
  `github.com/*/*/pull/*` invokes `ImportPullRequestFromSnapshot`, which reads the page's URL and
  delegates to the existing import (so a public pull request works with no GitHub connection).

  The extension's default Composer hosts are now `preview.composer.space` and `composer.space`.

- 29087d8: Approving a pull request now falls back to a marked conversation comment where GitHub refuses the review — the author's own pull request, or a token without review permission — so the verdict is recorded and an agent can detect that the pull request is good to land.
- 2ea03b8: Importing a pull request no longer fails when a space's GitHub connection holds a token GitHub has
  since rejected: the read is retried anonymously, which reaches any public pull request. A pull
  request that is genuinely out of reach now says so, naming the connection rather than the reference.
- f427665: A pull request action that fails because GitHub rejected the space's connection token now says so
  and points at reconnecting, instead of surfacing the raw HTTP error. A `401` reached the toast as
  `StatusCode: non 2xx status code (401 GET https://api.github.com/...)`, which named neither the
  cause nor anything the user could do about it.
- e4e320f: "Import pull request" now says when there is no space to import into, instead of doing nothing at all: the command is reachable from the root, which has no space of its own, so pressing Import with another workspace focused silently returned. The dialog stays open with the typed reference.
- 40b5f5e: The pull request article opens on an Overview tab: the description as markdown, with demo videos and
  screenshots from the artifacts bucket as pills that preview in place; the Claude Code and Composer
  preview footers as cards beside the media; and every check on the head commit with its outcome,
  duration and a link to its logs. The walkthrough moves to its own tab.
- Updated dependencies [a92ea18]
- Updated dependencies [0280a6a]
- Updated dependencies [0c6c186]
- Updated dependencies [86d1482]
- Updated dependencies [af1c007]
- Updated dependencies [4862c8e]
- Updated dependencies [106d38a]
- Updated dependencies [9049c30]
- Updated dependencies [6186edc]
- Updated dependencies [e3ceced]
- Updated dependencies [8363f12]
- Updated dependencies [a7f4329]
- Updated dependencies [155ca6f]
- Updated dependencies [24cbdff]
- Updated dependencies [c50f666]
- Updated dependencies [a7f4329]
- Updated dependencies [9477170]
- Updated dependencies [0524d38]
- Updated dependencies [e2eecf2]
- Updated dependencies [2800d03]
- Updated dependencies [4ececc6]
- Updated dependencies [96f94c2]
- Updated dependencies [c95def4]
- Updated dependencies [3c7b013]
- Updated dependencies [fd873d2]
- Updated dependencies [b1dc20c]
- Updated dependencies [ac71815]
- Updated dependencies [7c87626]
- Updated dependencies [c020513]
- Updated dependencies [6388838]
- Updated dependencies [592b00e]
- Updated dependencies [f82c78f]
- Updated dependencies [1a8043c]
- Updated dependencies [6d52561]
- Updated dependencies [520c34f]
- Updated dependencies [28b7621]
- Updated dependencies [9714c75]
- Updated dependencies [e954c0f]
- Updated dependencies [9ef5485]
- Updated dependencies [22bea85]
- Updated dependencies [a069511]
- Updated dependencies [066b35d]
- Updated dependencies [63fc847]
- Updated dependencies [b4ceea2]
- Updated dependencies [bdb02cd]
- Updated dependencies [48eb05d]
- Updated dependencies [4a0b78b]
- Updated dependencies [34a8433]
- Updated dependencies [bd6ba8e]
- Updated dependencies [0fe00c5]
- Updated dependencies [28ad891]
- Updated dependencies [b8762ef]
- Updated dependencies [f3f55a8]
- Updated dependencies [b2d5bb2]
- Updated dependencies [3aa3d63]
- Updated dependencies [2d4107f]
- Updated dependencies [73daef4]
- Updated dependencies [75971ad]
- Updated dependencies [3958355]
- Updated dependencies [fd23a8b]
- Updated dependencies [4e417e9]
- Updated dependencies [194b1d3]
- Updated dependencies [d194929]
- Updated dependencies [6ef35a6]
- Updated dependencies [557e243]
- Updated dependencies [864cd0d]
- Updated dependencies [49aee6c]
- Updated dependencies [ea11703]
- Updated dependencies [cff33b7]
- Updated dependencies [5305365]
- Updated dependencies [881f900]
- Updated dependencies [881f900]
- Updated dependencies [881f900]
- Updated dependencies [881f900]
- Updated dependencies [881f900]
- Updated dependencies [b2caee6]
- Updated dependencies [9baf25f]
- Updated dependencies [5dc2419]
- Updated dependencies [a09e18e]
- Updated dependencies [f56ef6c]
- Updated dependencies [a3d45c4]
- Updated dependencies [938bd20]
- Updated dependencies [dcf911b]
- Updated dependencies [b83b831]
- Updated dependencies [dd17e57]
- Updated dependencies [6d28380]
- Updated dependencies [329faa0]
- Updated dependencies [d770fe7]
- Updated dependencies [88e3ebd]
- Updated dependencies [a7f4329]
- Updated dependencies [da37a13]
- Updated dependencies [0a01ff7]
- Updated dependencies [1c995c4]
- Updated dependencies [6f4a887]
- Updated dependencies [ab56cfe]
- Updated dependencies [d0beedc]
- Updated dependencies [731b264]
- Updated dependencies [a69d861]
- Updated dependencies [ba08e65]
- Updated dependencies [2643a00]
- Updated dependencies [dbff1e4]
- Updated dependencies [07565c8]
- Updated dependencies [5fcd238]
- Updated dependencies [5e8878c]
- Updated dependencies [6409948]
- Updated dependencies [792c756]
- Updated dependencies [1cf6347]
- Updated dependencies [0cde959]
- Updated dependencies [e094f74]
- Updated dependencies [9ab38fa]
- Updated dependencies [b3673ee]
- Updated dependencies [23d2d8c]
- Updated dependencies [915db6a]
- Updated dependencies [3e02201]
- Updated dependencies [2e4c299]
- Updated dependencies [4800a6f]
- Updated dependencies [1b62726]
- Updated dependencies [a3b6ef0]
- Updated dependencies [782a442]
- Updated dependencies [b02fe16]
- Updated dependencies [7b49616]
- Updated dependencies [f0d3620]
- Updated dependencies [472ca95]
- Updated dependencies [5b99c47]
- Updated dependencies [181f374]
- Updated dependencies [252ca39]
- Updated dependencies [8fb29b3]
- Updated dependencies [c439ba0]
- Updated dependencies [6af130f]
- Updated dependencies [2c442f9]
- Updated dependencies [0264069]
- Updated dependencies [2922d36]
- Updated dependencies [d62a947]
- Updated dependencies [872f391]
- Updated dependencies [bd792a6]
- Updated dependencies [8608f03]
- Updated dependencies [51820a1]
- Updated dependencies [9ae0e5f]
- Updated dependencies [7d000b9]
- Updated dependencies [e56276b]
- Updated dependencies [66e9264]
- Updated dependencies [cafa240]
- Updated dependencies [813069c]
- Updated dependencies [84362af]
- Updated dependencies [76d6fca]
- Updated dependencies [4c107a2]
- Updated dependencies [26e31c1]
- Updated dependencies [8c20ee2]
- Updated dependencies [b9d72bb]
- Updated dependencies [eeff74c]
- Updated dependencies [279f87b]
- Updated dependencies [84568a0]
- Updated dependencies [251f586]
- Updated dependencies [3c85350]
- Updated dependencies [967b130]
- Updated dependencies [d90fe83]
- Updated dependencies [3e9a10f]
- Updated dependencies [8ea2bf9]
- Updated dependencies [8ca2ac7]
- Updated dependencies [2c06e2e]
- Updated dependencies [098a0bb]
- Updated dependencies [72f7584]
- Updated dependencies [e94ed89]
- Updated dependencies [882ac2a]
- Updated dependencies [0132aab]
- Updated dependencies [3ea0b0f]
- Updated dependencies [47c8d7e]
- Updated dependencies [10b1239]
- Updated dependencies [851791f]
- Updated dependencies [9c86066]
- Updated dependencies [608a172]
- Updated dependencies [5180720]
- Updated dependencies [b600f72]
- Updated dependencies [99e323d]
- Updated dependencies [ea11703]
- Updated dependencies [bf4f1e6]
- Updated dependencies [5913020]
- Updated dependencies [cc45381]
- Updated dependencies [bcfe4c5]
- Updated dependencies [6328de3]
- Updated dependencies [12b6618]
- Updated dependencies [41e2750]
- Updated dependencies [818a096]
- Updated dependencies [043c792]
- Updated dependencies [4aa6a33]
- Updated dependencies [0ac2e5f]
- Updated dependencies [9426389]
- Updated dependencies [2e5e188]
- Updated dependencies [ebb8f4a]
- Updated dependencies [4f760ce]
- Updated dependencies [9d2466a]
- Updated dependencies [557e243]
- Updated dependencies [ca34a80]
- Updated dependencies [9f2557b]
- Updated dependencies [29543ca]
- Updated dependencies [e26af7e]
- Updated dependencies [ab79741]
- Updated dependencies [c0e5651]
- Updated dependencies [3214dcf]
- Updated dependencies [8efc4f1]
- Updated dependencies [a283607]
- Updated dependencies [24fcadc]
- Updated dependencies [77a2d34]
- Updated dependencies [b00ee72]
- Updated dependencies [4804da0]
- Updated dependencies [61fe676]
- Updated dependencies [d4b4919]
- Updated dependencies [770c73d]
- Updated dependencies [63e500b]
- Updated dependencies [b72c1a2]
- Updated dependencies [7c426d4]
- Updated dependencies [064a184]
- Updated dependencies [cd4da46]
- Updated dependencies [ec4f4ca]
- Updated dependencies [78e5596]
- Updated dependencies [5662dfc]
- Updated dependencies [d1a69fb]
- Updated dependencies [b1bb838]
- Updated dependencies [19f19a2]
- Updated dependencies [2a41efd]
- Updated dependencies [1b6e258]
- Updated dependencies [93c7523]
- Updated dependencies [4a71ef2]
- Updated dependencies [987f7e1]
- Updated dependencies [e7fc023]
- Updated dependencies [142ba02]
- Updated dependencies [1ab4bb8]
- Updated dependencies [e1ee9dd]
- Updated dependencies [3061f43]
- Updated dependencies [32468c3]
- Updated dependencies [0a3e9dd]
- Updated dependencies [e2b04f6]
- Updated dependencies [22c7a70]
- Updated dependencies [256f286]
- Updated dependencies [4689d66]
- Updated dependencies [306f50d]
- Updated dependencies [8f372ce]
- Updated dependencies [690dcaa]
- Updated dependencies [3b09a05]
- Updated dependencies [e207c68]
- Updated dependencies [b7822a7]
- Updated dependencies [c8b65f3]
- Updated dependencies [9feee5e]
- Updated dependencies [f2d8a92]
- Updated dependencies [0e44f24]
- Updated dependencies [bd06669]
- Updated dependencies [5b504b4]
- Updated dependencies [d7b0a3b]
- Updated dependencies [20e86ba]
- Updated dependencies [1482a3f]
- Updated dependencies [a574300]
- Updated dependencies [af1ff99]
- Updated dependencies [4663f24]
- Updated dependencies [2513a52]
- Updated dependencies [2896a58]
- Updated dependencies [fa79a0e]
- Updated dependencies [d7bec53]
- Updated dependencies [17ed864]
- Updated dependencies [1d6f730]
- Updated dependencies [b125655]
- Updated dependencies [f962a7d]
- Updated dependencies [0280a6a]
- Updated dependencies [9e91762]
- Updated dependencies [f4c2702]
- Updated dependencies [2df0297]
- Updated dependencies [3e08678]
- Updated dependencies [dea5df9]
- Updated dependencies [7407d65]
- Updated dependencies [318bbad]
- Updated dependencies [9ffccd5]
- Updated dependencies [fc83abd]
- Updated dependencies [9a3f01e]
- Updated dependencies [178bc6d]
- Updated dependencies [58b59d7]
- Updated dependencies [efa7836]
- Updated dependencies [678ba58]
- Updated dependencies [8904184]
- Updated dependencies [a805212]
- Updated dependencies [66e5008]
- Updated dependencies [ff45e97]
- Updated dependencies [6fed038]
- Updated dependencies [77d0026]
- Updated dependencies [f8bfba0]
- Updated dependencies [ea11703]
- Updated dependencies [fa82aef]
- Updated dependencies [886453b]
- Updated dependencies [baa40a1]
- Updated dependencies [18597fc]
- Updated dependencies [9205bd3]
- Updated dependencies [fce2060]
- Updated dependencies [582fc22]
- Updated dependencies [892b718]
- Updated dependencies [bda45ac]
- Updated dependencies [63629c5]
- Updated dependencies [5885380]
- Updated dependencies [881f900]
- Updated dependencies [6a1ec57]
- Updated dependencies [e3d7a8c]
- Updated dependencies [d8e9de1]
- Updated dependencies [0c92b44]
- Updated dependencies [72b2984]
- Updated dependencies [5dedae9]
- Updated dependencies [693d1b4]
- Updated dependencies [32584c9]
- Updated dependencies [a3c10f1]
- Updated dependencies [32353e6]
- Updated dependencies [3ea8217]
- Updated dependencies [559acfa]
- Updated dependencies [1862edc]
- Updated dependencies [631df48]
- Updated dependencies [97efbaa]
- Updated dependencies [e8088ea]
- Updated dependencies [bb94124]
- Updated dependencies [928e0b2]
- Updated dependencies [1a3de22]
- Updated dependencies [5d816a6]
- Updated dependencies [85e6347]
- Updated dependencies [4c5b2c7]
- Updated dependencies [f9816c0]
- Updated dependencies [578b543]
- Updated dependencies [78523d2]
- Updated dependencies [6fd2a5d]
- Updated dependencies [525aee0]
- Updated dependencies [a20d4d9]
- Updated dependencies [40b50c2]
- Updated dependencies [f112c37]
- Updated dependencies [8048e42]
- Updated dependencies [520c34f]
- Updated dependencies [4ae2005]
- Updated dependencies [605455c]
- Updated dependencies [ff93962]
- Updated dependencies [9d8fcbd]
- Updated dependencies [85bdad2]
- Updated dependencies [e426625]
- Updated dependencies [3d23fd7]
- Updated dependencies [b2a44d6]
- Updated dependencies [a1d42c4]
- Updated dependencies [4a10672]
- Updated dependencies [ee180f6]
- Updated dependencies [c209b42]
- Updated dependencies [78433b0]
- Updated dependencies [77976e4]
- Updated dependencies [e0a9adb]
- Updated dependencies [f99a6e9]
- Updated dependencies [eda8b55]
- Updated dependencies [11de244]
- Updated dependencies [79d5ecf]
- Updated dependencies [cc11297]
- Updated dependencies [ff37699]
- Updated dependencies [6dadb41]
  - @dxos/echo@0.12.0
  - @dxos/app-framework@0.12.0
  - @dxos/app-toolkit@0.12.0
  - @dxos/plugin-markdown@0.12.0
  - @dxos/plugin-space@0.12.0
  - @dxos/ai@0.12.0
  - @dxos/compute@0.12.0
  - @dxos/react-ui@0.12.0
  - @dxos/effect@0.12.0
  - @dxos/app-graph@0.12.0
  - @dxos/graph@0.12.0
  - @dxos/protocols@0.12.0
  - @dxos/link@0.12.0
  - @dxos/types@0.12.0
  - @dxos/plugin-connector@0.12.0
  - @dxos/react-ui-list@0.12.0
  - @dxos/plugin-preview@0.12.0
  - @dxos/ui-editor@0.12.0
  - @dxos/react-ui-form@0.12.0
  - @dxos/react-ui-editor@0.12.0
  - @dxos/errors@0.12.0
  - @dxos/util@0.12.0
  - @dxos/log@0.12.0
  - @dxos/react-ui-menu@0.12.0
  - @dxos/lit-ui@0.12.0
  - @dxos/ui-types@0.12.0
  - @dxos/react-ui-markdown@0.12.0
  - @dxos/echo-react@0.12.0
  - @dxos/plugin-crx@0.12.0
  - @dxos/react-ui-masonry@0.12.0
  - @dxos/keys@0.12.0

## 0.11.1

### Patch Changes

- @dxos/app-framework@0.11.1
- @dxos/app-toolkit@0.11.1
- @dxos/client@0.11.1
- @dxos/compute@0.11.1
- @dxos/echo@0.11.1
- @dxos/errors@0.11.1
- @dxos/keys@0.11.1
- @dxos/link@0.11.1
- @dxos/log@0.11.1
- @dxos/protocols@0.11.1
- @dxos/types@0.11.1
- @dxos/util@0.11.1
- @dxos/plugin-connector@0.11.1

## 0.11.0

### Patch Changes

- Updated dependencies [f9ba47a]
- Updated dependencies [4e64123]
- Updated dependencies [c035062]
- Updated dependencies [9da013f]
- Updated dependencies [c3625d3]
- Updated dependencies [48d168e]
- Updated dependencies [e0e1a9f]
- Updated dependencies [46ec569]
- Updated dependencies [5b05d75]
- Updated dependencies [b5ecf54]
- Updated dependencies [3f6ac61]
- Updated dependencies [091ebe4]
- Updated dependencies [eec72c5]
- Updated dependencies [68e61ca]
- Updated dependencies [a19443b]
- Updated dependencies [3f1fc67]
- Updated dependencies [6df314a]
- Updated dependencies [962c8cd]
- Updated dependencies [2048cb3]
- Updated dependencies [856c4f0]
- Updated dependencies [46ec569]
- Updated dependencies [f8637f1]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [6a03a30]
- Updated dependencies [7b270f2]
- Updated dependencies [7b270f2]
- Updated dependencies [af5fbf4]
- Updated dependencies [d547045]
- Updated dependencies [410a019]
- Updated dependencies [30ae5eb]
- Updated dependencies [2543b63]
- Updated dependencies [6d2afe0]
- Updated dependencies [f6a01e3]
- Updated dependencies [0d1f866]
- Updated dependencies [5e7839e]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [c727a43]
- Updated dependencies [9f7d5ad]
- Updated dependencies [6067460]
- Updated dependencies [12fd785]
- Updated dependencies [d547045]
- Updated dependencies [f10b1ce]
- Updated dependencies [f7d7735]
- Updated dependencies [717edc0]
- Updated dependencies [5f08a6a]
- Updated dependencies [114fb98]
- Updated dependencies [b591791]
- Updated dependencies [f15c632]
- Updated dependencies [3761762]
- Updated dependencies [c727a43]
- Updated dependencies [4bb7e3b]
- Updated dependencies [7b270f2]
- Updated dependencies [686fac1]
- Updated dependencies [ed992c2]
- Updated dependencies [37c17cc]
- Updated dependencies [f0ec728]
- Updated dependencies [08a3eea]
- Updated dependencies [a49131a]
- Updated dependencies [5585ec8]
- Updated dependencies [ac51564]
- Updated dependencies [499dde4]
  - @dxos/echo@0.11.0
  - @dxos/plugin-connector@0.11.0
  - @dxos/link@0.11.0
  - @dxos/app-toolkit@0.11.0
  - @dxos/client@0.11.0
  - @dxos/compute@0.11.0
  - @dxos/util@0.11.0
  - @dxos/protocols@0.11.0
  - @dxos/app-framework@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/types@0.11.0
  - @dxos/log@0.11.0
  - @dxos/errors@0.11.0
