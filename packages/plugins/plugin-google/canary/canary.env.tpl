# For local runs only: `op run --env-file packages/plugins/plugin-google/canary/canary.env.tpl -- <command>` resolves
# these references into the environment. The nightly workflow reads GitHub secrets instead. Never put a value here.
GMAIL_CLIENT_ID=op://eng-dev/ywmy6udhpxhio2ztweplllyvgq/dev/CLIENT_ID
GMAIL_CLIENT_SECRET=op://eng-dev/ywmy6udhpxhio2ztweplllyvgq/dev/CLIENT_SECRET
GMAIL_REFRESH_TOKEN=op://eng-dev/mdp6rtp7dehxbr7e6n5iiabnim/REFRESH_TOKEN
DX_CANARY_RECOVERY_PHRASE=op://eng-dev/mdp6rtp7dehxbr7e6n5iiabnim/RECOVERY_PHRASE
