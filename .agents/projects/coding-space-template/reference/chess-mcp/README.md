# chess-mcp — the artifact the template produces

Not part of the DXOS build. This is the Worker that stages two–four of the "Chess MCP on Workers"
space template produce, kept here as **reference and as evidence the template's plan is
executable** — every claim the template makes about deploying and calling it was verified against
this code, and a future session recording the demo need not rebuild it from scratch.

## Running it

```bash
npm install
npx wrangler deploy --temporary   # no Cloudflare account; prints a claim URL, one-hour window
```

Then register `https://<name>.<account>.workers.dev/mcp` as an MCP server in the space, protocol
`http`.

## What was verified (2026-09-10)

Deployed and called over the wire:

```
$ curl -s $URL/
chess-mcp: alive
POST /mcp for the MCP endpoint (2 tools)

$ curl -s -X POST $URL/mcp -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' -H 'content-type: application/json'
{"jsonrpc":"2.0","id":1,"result":{"tools":[{"name":"best_move",…},{"name":"evaluate_position",…}]}}

# The position the template seeds (1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7):
$ curl -s -X POST $URL/mcp -d '{"jsonrpc":"2.0","id":2,"method":"tools/call",
    "params":{"name":"best_move","arguments":{"fen":"r1bqk2r/1pppbppp/p1n2n2/4p3/B3P3/5N2/PPPP1PPP/RNBQ1RK1 w kq - 4 6"}}}'
{"bestMove":"Bxc6","scoreCentipawns":36,"depth":2,"nodesSearched":771,"truncated":false,
 "turn":"white","legalMoves":25}      # 1.4s wall, including transport

$ … '{"name":"best_move","arguments":{"fen":"not a fen"}}'
{"error":"Could not read the position: Invalid FEN: castling availability is invalid"}   # isError: true
```

`initialize` answers protocol `2025-06-18`. A bad FEN is a **tool** error (`isError: true`), not a
JSON-RPC error — it is the model's input to correct, so it has to reach the model rather than the
transport. The JSON-RPC edge cases were checked too, after review found all four of these broken:

```
null      -> {"jsonrpc":"2.0","id":null,"error":{"code":-32600,"message":"Invalid Request"}}
[]        -> {"jsonrpc":"2.0","id":null,"error":{"code":-32600,"message":"Invalid Request"}}
bad json  -> {"jsonrpc":"2.0","id":null,"error":{"code":-32700,"message":"Parse error"}}
batch     -> [{"jsonrpc":"2.0","id":1,"result":{}}]      # the notification correctly drops out
checkmate -> {"bestMove":null,"scoreCentipawns":-100000,"legalMoves":0,...}
```

A terminal position used to leave `bestScore` at `-Infinity`, which `JSON.stringify` writes as
`null`; it now answers with the terminal evaluation and `bestMove: null`. `null` as the whole body
is valid JSON, so it reached the handler and threw on destructuring rather than answering `-32600`.

## Three things this taught the template

1. **`--temporary` is not optional.** Plain `wrangler deploy` refuses in a non-interactive shell and
   demands `CLOUDFLARE_API_TOKEN`; its own error names the flag. Stage two says so now.
2. **`Date.now()` does not advance during synchronous compute in a Worker.** A wall-clock search
   budget is therefore inert and the call reports `elapsedMs: 0`. The engine bounds by node count
   instead, and the skill carries the general rule.
3. **Stockfish WASM is not what this bundles.** The engine is alpha-beta over `chess.js` with a
   material-plus-mobility evaluation — which is the fallback stage one's task explicitly asks the
   runner to state. It plays weakly and is not trying to compete: the claim it has to carry is that
   the move came from a search on the server, not from a language model's memory. `nodesSearched`
   in every response is what makes that checkable.
