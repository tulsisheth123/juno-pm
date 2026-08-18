# Juno Dashboard

The working front-end for Juno's core loop: **raw transcripts → structured insights → draft PRD.**

Open `index.html` in a browser. No build step, no dependencies, no network calls.

## Layout

| Column | Contents |
|---|---|
| Left | Raw user transcripts. Sessions are split on blank lines or `---` rules; word and session counts update live. |
| Middle | Structured insights — one card per theme, each with a priority (P0/P1/P2), a sentiment, a supporting quote pulled from the source text, and the share of sessions it appeared in. |
| Right | Draft PRD rendered from markdown — problem, requirements table, success metrics, open questions. Copy the raw markdown with **Copy markdown**. |

## Interactions

- **Process** — runs the pipeline. Disables the input, swaps the columns to skeleton loaders, and steps a labelled progress bar through segmenting → clustering → scoring → drafting. `⌘/Ctrl + ↵` does the same.
- **Cancel** — invalidates the in-flight run and restores the empty state.
- **Load sample** — seeds seven representative research sessions.

## What is and isn't real

The three columns, the state machine, and the loading behaviour are real. `analyse()` in `app.js` is a **stand-in for the model call** — it clusters with keyword heuristics so the demo reacts to whatever is actually pasted, rather than replaying a fixed script. Replace that one function with a `fetch` when the backend exists; nothing else needs to change.
