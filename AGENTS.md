# EqualVoice — Agent Instructions

## What this is
An evaluation tool that audits whether an AI summary preserves each
contributor's claim. It is NOT a summarizer. See equalvoice_build_spec.md
(source of truth). Do not add features beyond that spec.

## Stack
TypeScript, React + Vite front end, Node 20+ server for the OpenAI key.
Model: GPT-5.6. Do not switch stacks or add frameworks without being asked.

## Data contracts
Use the exact JSON shapes in the spec (Comment, Claim, CoverageVerdict,
CoverageReport). Do not vary field names.

## Non-goals (do not build)
No claim clustering/dedup (one claim per comment). No auto comment→claim
extraction in the demo path. No embeddings unless trivial and last. No
"fixed summary" generator. No live re-summarization in demo mode. No auth/db.

## Validation
- Run `npm test` after any change to the scoring module; all tests must pass.
- Run `npm run lint` and `npm run typecheck` before finishing a task.
- Demo mode must run with no API key set.

## Constraints
- The scoring module is pure and deterministic; no network calls inside it.
- Parse model output defensively: retry once, then surface an error verdict;
  never crash the UI on a bad parse.
- Keep the app runnable after every task.

## Definition of done (per task)
Tests pass, lint/typecheck clean, app still runs, and the change matches the
relevant roadmap step's "Done when" in the spec.