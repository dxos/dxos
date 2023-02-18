# Kodama (こだま)

Kodama is an interactive ECHO CLI.

The word kodama (こだま) is the Japanese word for echo.

## Demo

https://user-images.githubusercontent.com/3523355/183263486-f6fb3d8e-88f1-4915-a6e7-afbe74e5b20a.mov

## Build

```bash
rushx build
```

> - TODO: Configure to use `esbuild` directly.

## Build

```bash
rushx build
```

> - TODO: Configure to use `esbuild` directly.

## Usage

To start the `kodama` CLI in interactive mode:

```bash
./kodama/bin.js
```

Navigate the menu system using the `tab` and cursor keys.
The currently focused panel will have a green border.

### Profile

First create a HALO profile by entering a username:

`> HALO > Create Profile`

Your keyphrase will be copied in to the clipboard.

### Spaces

Next create a space:

`> ECHO > Spaces`

Enter the space name, then navigate to select the space.

Next enter some items.

`> ECHO > Spaces > [select] > Items`

### Sharing

Open `kodama` in another terminal and create a new Profile.

Using the **first** peer navigate to share the space:

`> ECHO > Spaces > [select] > Share`

The invitation code will be copied into the clipboard.

In the **second** peer join the space.

`> ECHO > Spaces > Join`

Paste the invitation key, then enter the 4-digit code.
Next navigate to the space and enter some items.

## Development

To run in development mode with a pre-created profile:

```bash
rushx build && ./bin/kodama.js --username Test --debug
```

NOTE: the `watch` script is flaky and interferes with stdin.
