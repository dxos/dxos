# `op run --env-file packages/plugins/plugin-google/canary/gmail.env.tpl -- <command>` resolves these references into the
# environment. Never put a value in this file.
# Items are named by id: `op run` does not resolve `eng-dev/com.google` by name.
# ywmy6udhpxhio2ztweplllyvgq is eng-dev/com.google; mdp6rtp7dehxbr7e6n5iiabnim is eng-dev/network.dxos.mail-canary.
GMAIL_CLIENT_ID=op://eng-dev/ywmy6udhpxhio2ztweplllyvgq/dev/CLIENT_ID
GMAIL_CLIENT_SECRET=op://eng-dev/ywmy6udhpxhio2ztweplllyvgq/dev/CLIENT_SECRET
GMAIL_REFRESH_TOKEN=op://eng-dev/mdp6rtp7dehxbr7e6n5iiabnim/REFRESH_TOKEN
