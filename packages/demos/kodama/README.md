# Kodama

Kodama is an interactive ECHO CLI.
The word kodama (こだま) is the Japanese word for echo.

## Demo

https://user-images.githubusercontent.com/3523355/181782019-20aea084-8ee5-4e44-926a-e3f98bd6b052.mov

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

### Parties

Next create a Party:

`> ECHO > Parties`

Enter the Party name, then navigate to select the party.

Next enter some items.

`> ECHO > Parties > [select] > Items`

### Sharing

Open `kodama` in another terminal and create a new Profile.

Using the **first** peer navigate to share the Party:

`> ECHO > Parties > [select] > Share`

The invitation code will be copied into the clipboard.

In the **second** peer join the Party.

`> ECHO > Parties > Join`

Paste the invitation key, then enter the 4-digit code.
Next navigate to the Party and enter some items.


