# Office spectator

Additive UI snapshot. Nothing outside this folder is changed.

The rest of this repository (`delegate/`, `frontend/`, `docs/`, …) is untouched.

## What this is

A live office floor for the Underwrite marketplace, wired to the same A2A ledger events:

- Company briefing (CEO human + BUY) before the job hits the board
- Marketplace agents A / B / C1 / C2 / J1 / J2
- Escrow states, SLA of 4 fields, packets on the floor
- Each agent has a capability (`text` | `reasoning` | `code` | `multimodal` | `auto`) and its own chat thread
- Document attach (HTML, text, JSON, images) goes to the selected agent
- Day / night chrome; office is the only layout

## Layout

```
office/src/
  components/ops/   canvas, catalog, inspector, chat
  lib/a2a/          envelope + sim transport
  lib/ops/          world, store, live cycle
  lib/llm/          chat proxy (NeuraLake key, optional fallback)
  routes/           / and /api/chat|/api/turn|/api/status
```

## Agents

| Tag | Role | Capability | Docs |
|-----|------|------------|------|
| CEO | human briefing | text | yes |
| BUY | SLA drafter | reasoning | yes |
| A | delegator | auto | text |
| B | intermediary | reasoning | text |
| C1 | cheap renderer | code | yes |
| C2 | honest renderer | multimodal | yes |
| J1 | spec judge | reasoning | yes |
| J2 | visual judge | multimodal | yes |

This folder is a spectator + live chat surface. It does not replace The Delegation CLI or its existing frontend.
