# @dxos/agent-runtime

## 0.12.0

### Minor Changes

- cd205fb: Add a `TurnProducer` seam to the agent process so an alternative engine can produce conversation turns: `AgentServiceOptions.makeTurnProducer` injects the producer (defaulting to the built-in `AiSession`), and the new `AssistantCapabilities.AgentTurnProducer` capability lets a plugin contribute one.
- 6a1ec57: Add `Task.attachments`, files a task owns, with `Task.addAttachment`/`Task.removeAttachment` recording each change in the task's history, and the `tasks.addAttachment`/`tasks.removeAttachment` operations. Where plugin-file is installed, files dropped or pasted onto a task's article are stored and attached, with a placeholder card while each uploads and "Remove attachment" in the card's menu.

  `CardMasonry` (plugin-space) is now exported from `@dxos/plugin-space/components`, and `AppSurface.CardMasonryData` gains `size: 'compact'` (cards at three quarters, so a companion fits two columns), `inline` (in the host's flow rather than its own scroller), `pending` placeholder cards, and `CardMenu`, through which a host adds items to each card's menu. The `cardMasonry` surface now activates when requested on its own. A task's attachments and artifacts render through it.

  Image file cards fill the card; agent assignees use a robot glyph; tags centre their content.

  A task delegated to a chat is marked failed when the chat's model request fails, rather than staying started: `DelegationStrategy` gains an optional `onTurnFailed` hook, called when a turn fails (not when it is interrupted), and the supervisor fails the tasks the conversation holds, recording the error in the task's history. Delegating to a chat now names the chat as the assignee's `subject`, so the supervisor no longer mistakes the task for an orphaned sub-agent's; an agent standing for a non-session object reads as "Agent" rather than an id.

  A role-gated surface module (`AppCapability.surface` with `roles`) now logs an error when it loads if one of its surfaces binds a role it did not declare — the omission that left the `cardMasonry` surface unrendered wherever it was requested on its own.

### Patch Changes

- 9477170: Fixed "Process not hydrated" when an agent session was resolved from a persisted process that was not live. `AgentService.getSession` rediscovers such a process as a dormant, read-only handle and now adopts the live handle that `Handle.hydrate` returns instead of the dormant view, so the first prompt is delivered rather than dying.

  `ProcessManager`'s dormant handles also support `terminate()` now: discarding a stale process (for example one whose immutable spawn annotations no longer match the request) deletes its record and those of its dormant descendants without booting it first.

- b83d607: Chats that have not picked a model now default to Claude Sonnet 5 instead of the first catalog entry (Opus 5). Space-home starter prompts skip the model until a space has five recent objects, and reuse cached prompts while the set of recent objects is unchanged (up to a week), regenerating at most hourly otherwise.
- ab734ba: A skill authored in a space can now be bound to a chat. Such a skill has no registry key, and the
  context binder dropped every keyless skill on the way in, so the picker's toggle did nothing at all:
  the row never ticked and the conversation never saw the skill.

  Keyless skills are now carried through the binder, and the picker addresses a skill by its object
  rather than re-looking it up by registry key — which is what silently no-oped. A space copy of a
  registry skill also now shadows the registry entry in the picker (it carries the user's edits, the
  same precedence `Skill.resolveAnnotatedSkills` already applies), and toggling it off clears either
  form from the conversation.

  `AgentService.createSession` likewise binds a skill that is already in a database as-is and
  references any other skill by its registry URI, instead of cloning it into the space through the
  deprecated `Skill.upsert` — which threw outright on a space-authored skill and would have
  substituted the pristine registry copy for a fork. Such a URI resolves through the database's own
  registry, so the assistant test layer now seeds a skill there as well as into `Registry.Service`.

- Updated dependencies [a92ea18]
- Updated dependencies [375de88]
- Updated dependencies [9477170]
- Updated dependencies [0c6c186]
- Updated dependencies [4025ffe]
- Updated dependencies [2cad6c0]
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
- Updated dependencies [d2be597]
- Updated dependencies [e2eecf2]
- Updated dependencies [2800d03]
- Updated dependencies [4ececc6]
- Updated dependencies [c95def4]
- Updated dependencies [3c7b013]
- Updated dependencies [fd873d2]
- Updated dependencies [b1dc20c]
- Updated dependencies [ac71815]
- Updated dependencies [7c87626]
- Updated dependencies [592b00e]
- Updated dependencies [ab734ba]
- Updated dependencies [f82c78f]
- Updated dependencies [066b35d]
- Updated dependencies [63fc847]
- Updated dependencies [0fe00c5]
- Updated dependencies [7560ca7]
- Updated dependencies [b8762ef]
- Updated dependencies [f3f55a8]
- Updated dependencies [b2d5bb2]
- Updated dependencies [75971ad]
- Updated dependencies [3958355]
- Updated dependencies [fd23a8b]
- Updated dependencies [6ef35a6]
- Updated dependencies [49aee6c]
- Updated dependencies [ea11703]
- Updated dependencies [b2caee6]
- Updated dependencies [9baf25f]
- Updated dependencies [a3d45c4]
- Updated dependencies [dcf911b]
- Updated dependencies [b83b831]
- Updated dependencies [88e3ebd]
- Updated dependencies [a7f4329]
- Updated dependencies [da37a13]
- Updated dependencies [0a01ff7]
- Updated dependencies [1c995c4]
- Updated dependencies [6f4a887]
- Updated dependencies [7575cb6]
- Updated dependencies [d0beedc]
- Updated dependencies [731b264]
- Updated dependencies [a69d861]
- Updated dependencies [ba08e65]
- Updated dependencies [9817b6f]
- Updated dependencies [f38f3ae]
- Updated dependencies [07565c8]
- Updated dependencies [5fcd238]
- Updated dependencies [5e8878c]
- Updated dependencies [6409948]
- Updated dependencies [792c756]
- Updated dependencies [1cf6347]
- Updated dependencies [0cde959]
- Updated dependencies [e094f74]
- Updated dependencies [9ab38fa]
- Updated dependencies [99dcc7c]
- Updated dependencies [b3673ee]
- Updated dependencies [915db6a]
- Updated dependencies [3e02201]
- Updated dependencies [261c821]
- Updated dependencies [2e4c299]
- Updated dependencies [a3b6ef0]
- Updated dependencies [b02fe16]
- Updated dependencies [7b49616]
- Updated dependencies [472ca95]
- Updated dependencies [49271cd]
- Updated dependencies [0426925]
- Updated dependencies [252ca39]
- Updated dependencies [8fb29b3]
- Updated dependencies [c439ba0]
- Updated dependencies [6af130f]
- Updated dependencies [c8b7158]
- Updated dependencies [2c442f9]
- Updated dependencies [0264069]
- Updated dependencies [2922d36]
- Updated dependencies [d62a947]
- Updated dependencies [872f391]
- Updated dependencies [51820a1]
- Updated dependencies [9ae0e5f]
- Updated dependencies [7d000b9]
- Updated dependencies [66e9264]
- Updated dependencies [84362af]
- Updated dependencies [76d6fca]
- Updated dependencies [4c107a2]
- Updated dependencies [84622b1]
- Updated dependencies [e5c13e4]
- Updated dependencies [26e31c1]
- Updated dependencies [8c20ee2]
- Updated dependencies [b9d72bb]
- Updated dependencies [eeff74c]
- Updated dependencies [967b130]
- Updated dependencies [3e9a10f]
- Updated dependencies [8ea2bf9]
- Updated dependencies [5cf307d]
- Updated dependencies [6139557]
- Updated dependencies [8ca2ac7]
- Updated dependencies [72f7584]
- Updated dependencies [e94ed89]
- Updated dependencies [882ac2a]
- Updated dependencies [0132aab]
- Updated dependencies [47c8d7e]
- Updated dependencies [10b1239]
- Updated dependencies [490127e]
- Updated dependencies [851791f]
- Updated dependencies [608a172]
- Updated dependencies [d535d55]
- Updated dependencies [5180720]
- Updated dependencies [b600f72]
- Updated dependencies [99e323d]
- Updated dependencies [ea11703]
- Updated dependencies [9477170]
- Updated dependencies [bcfe4c5]
- Updated dependencies [6328de3]
- Updated dependencies [12b6618]
- Updated dependencies [4aa6a33]
- Updated dependencies [0ac2e5f]
- Updated dependencies [9426389]
- Updated dependencies [2e5e188]
- Updated dependencies [ebb8f4a]
- Updated dependencies [9d2466a]
- Updated dependencies [ca34a80]
- Updated dependencies [9f2557b]
- Updated dependencies [47d48cd]
- Updated dependencies [a283607]
- Updated dependencies [40ecd44]
- Updated dependencies [24fcadc]
- Updated dependencies [1160094]
- Updated dependencies [b00ee72]
- Updated dependencies [4804da0]
- Updated dependencies [2bb84d8]
- Updated dependencies [63e500b]
- Updated dependencies [7c426d4]
- Updated dependencies [02fe893]
- Updated dependencies [cd4da46]
- Updated dependencies [78e5596]
- Updated dependencies [b1bb838]
- Updated dependencies [19f19a2]
- Updated dependencies [2a41efd]
- Updated dependencies [72b7606]
- Updated dependencies [a09e18e]
- Updated dependencies [142ba02]
- Updated dependencies [e1ee9dd]
- Updated dependencies [8610d9d]
- Updated dependencies [fc8c80c]
- Updated dependencies [256f286]
- Updated dependencies [690dcaa]
- Updated dependencies [14c2fab]
- Updated dependencies [89f2811]
- Updated dependencies [092f3be]
- Updated dependencies [74f9b30]
- Updated dependencies [5b504b4]
- Updated dependencies [eb95cd7]
- Updated dependencies [a53cabb]
- Updated dependencies [d7b0a3b]
- Updated dependencies [1482a3f]
- Updated dependencies [a574300]
- Updated dependencies [16e0588]
- Updated dependencies [2513a52]
- Updated dependencies [5a00dcb]
- Updated dependencies [17ed864]
- Updated dependencies [f81a4f0]
- Updated dependencies [6668dba]
- Updated dependencies [b125655]
- Updated dependencies [f962a7d]
- Updated dependencies [4f55909]
- Updated dependencies [f4c2702]
- Updated dependencies [7407d65]
- Updated dependencies [318bbad]
- Updated dependencies [9ffccd5]
- Updated dependencies [9a3f01e]
- Updated dependencies [ea11703]
- Updated dependencies [fa82aef]
- Updated dependencies [18597fc]
- Updated dependencies [9205bd3]
- Updated dependencies [fce2060]
- Updated dependencies [bda45ac]
- Updated dependencies [63629c5]
- Updated dependencies [5885380]
- Updated dependencies [881f900]
- Updated dependencies [6a1ec57]
- Updated dependencies [a357f0c]
- Updated dependencies [d8e9de1]
- Updated dependencies [72b2984]
- Updated dependencies [693d1b4]
- Updated dependencies [32584c9]
- Updated dependencies [32353e6]
- Updated dependencies [3ea8217]
- Updated dependencies [559acfa]
- Updated dependencies [1862edc]
- Updated dependencies [97efbaa]
- Updated dependencies [e8088ea]
- Updated dependencies [1a3de22]
- Updated dependencies [5d816a6]
- Updated dependencies [578b543]
- Updated dependencies [78523d2]
- Updated dependencies [40b50c2]
- Updated dependencies [f112c37]
- Updated dependencies [e64e2b5]
- Updated dependencies [85bdad2]
- Updated dependencies [e426625]
- Updated dependencies [3d23fd7]
- Updated dependencies [077cd58]
- Updated dependencies [4a10672]
- Updated dependencies [ee180f6]
- Updated dependencies [c209b42]
- Updated dependencies [eda8b55]
- Updated dependencies [cc11297]
- Updated dependencies [ff37699]
- Updated dependencies [6dadb41]
  - @dxos/echo@0.12.0
  - @dxos/assistant@0.12.0
  - @dxos/compute-runtime@0.12.0
  - @dxos/ai@0.12.0
  - @dxos/schema@0.12.0
  - @dxos/compute@0.12.0
  - @dxos/effect@0.12.0
  - @dxos/link@0.12.0
  - @dxos/echo-client@0.12.0
  - @dxos/types@0.12.0
  - @dxos/util@0.12.0
  - @dxos/log@0.12.0
  - @dxos/mcp-client@0.12.0
  - @dxos/keys@0.12.0

## 0.11.1

### Patch Changes

- @dxos/ai@0.11.1
- @dxos/compute@0.11.1
- @dxos/compute-runtime@0.11.1
- @dxos/echo@0.11.1
- @dxos/echo-client@0.11.1
- @dxos/effect@0.11.1
- @dxos/errors@0.11.1
- @dxos/keys@0.11.1
- @dxos/log@0.11.1
- @dxos/schema@0.11.1
- @dxos/types@0.11.1
- @dxos/util@0.11.1

## 0.11.0

### Patch Changes

- Updated dependencies [f9ba47a]
- Updated dependencies [4e64123]
- Updated dependencies [c035062]
- Updated dependencies [9da013f]
- Updated dependencies [46ec569]
- Updated dependencies [b5ecf54]
- Updated dependencies [3f6ac61]
- Updated dependencies [091ebe4]
- Updated dependencies [1a9bca1]
- Updated dependencies [bf013a1]
- Updated dependencies [a83d98a]
- Updated dependencies [a19443b]
- Updated dependencies [3f1fc67]
- Updated dependencies [46ec569]
- Updated dependencies [f8637f1]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [6a03a30]
- Updated dependencies [7b270f2]
- Updated dependencies [7b270f2]
- Updated dependencies [af5fbf4]
- Updated dependencies [d547045]
- Updated dependencies [6d2afe0]
- Updated dependencies [f6a01e3]
- Updated dependencies [5e7839e]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [6067460]
- Updated dependencies [12fd785]
- Updated dependencies [f7d7735]
- Updated dependencies [5f08a6a]
- Updated dependencies [3761762]
- Updated dependencies [bf055c8]
- Updated dependencies [bdf9f68]
- Updated dependencies [4bb7e3b]
- Updated dependencies [7b270f2]
- Updated dependencies [686fac1]
- Updated dependencies [96109be]
- Updated dependencies [37c17cc]
- Updated dependencies [f0ec728]
- Updated dependencies [08a3eea]
- Updated dependencies [a49131a]
- Updated dependencies [4f24c4e]
- Updated dependencies [ac51564]
  - @dxos/echo@0.11.0
  - @dxos/schema@0.11.0
  - @dxos/compute-runtime@0.11.0
  - @dxos/echo-client@0.11.0
  - @dxos/compute@0.11.0
  - @dxos/util@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/types@0.11.0
  - @dxos/log@0.11.0
  - @dxos/ai@0.11.0
  - @dxos/assistant@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/errors@0.11.0
