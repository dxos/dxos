# DXOS Oh-my-zsh Plugin

## Installation

Run the following script to create a symlink in your local `.oh-my-zsh` to the custom `dxos` plugin in this repo.

```bash
./install-ohmyz.sh
```

Add the plugin to the [`antigen`](https://github.com/zsh-users/antigen) config in your `.zshrc` config.

For example:

```bash
source '~/.zsh/antigen.zsh'

antigen use oh-my-zsh

antigen bundle git
antigen bundle zsh-users/zsh-autosuggestions
antigen bundle zsh-users/zsh-syntax-highlighting

antigen bundle ~/.oh-my-zsh/custom/plugins/dxos

antigen apply
```

## Commands

| Command       | Description                                                    | Examples                       |
|---------------|----------------------------------------------------------------|--------------------------------|
| `m <path>`    | Quick `cd` to package folder.                                  | `m client` or `m /` (for root) |
| `p <target>`  | Run the target (executor) in the current directory.            | `p build`                      |
| `pc <target>` | Run the target in the local directory busting the cache.       | `pc test`                      |
| `pa <target>` | Run the target against all projects.                           | `pa lint`                      |
| `pre [-c]`    | Build, test, and lint everything. Optionally `git clean -xdf`. |                                |
| `gs`          | Interactive git select branch.                                 |                                |
| `gb`          | Git branch with commit summary.                                |                                |

## Recommended

| Tool                 | Description     | Examples                                       |
|----------------------|-----------------|------------------------------------------------|
| `brew install gh`    | Github commands | `gh pr list`                                   |
| `brew install jq`    | JSON query      | `cat package.json &vert; jq -r ..dependencies` |
