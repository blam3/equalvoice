# Using Codex Well on EqualVoice — Craftsmanship & Showcase Guide

The goal of this file is narrow: make your Codex use *skillful and visible* so the "Technological Implementation" score reflects genuine effort and a real, non-trivial build — and so the README, video, and Session ID all corroborate that. Everything here is grounded in current (2026) Codex guidance; sources are named inline.

---

## 1. The bar you're actually clearing

Build Week's own guidance is explicit that judges evaluate *how well you used the coding agent*, and the single most-repeated "winner vs. also-ran" tip is to **make Codex visible** — call out in the README and video where Codex accelerated the work and where it made architectural decisions (aimagazine.blog, "OpenAI Build Week," Jul 2026). The judging panel is senior OpenAI staff including Thibault Sottiaux (Head of Product & Platform) and Peter Steinberger — both of whom also judged the Feb 2026 Codex hackathon, so it's worth knowing what those events rewarded (see §7).

The other three Build Week tips from the same source: demo a *product*, not a prototype (polish, edge cases, runs without you); pick a *narrow real problem*; and *document obsessively*. EqualVoice's spec is built to satisfy all three — this guide handles the "make Codex visible" half.

## 2. What Codex is in 2026 (so you use the right surface)

Codex is an agentic coding system, not a chatbot: it reads and edits files, runs commands, executes tests, and proposes changes inside an isolated environment preloaded with your repo, across three surfaces that share configuration — the CLI, the IDE extension, and the Codex app (OpenAI Codex docs, developers.openai.com/codex; smart-webtech, Apr 2026). Tasks typically run 1–30 minutes. For the hackathon you must use **GPT-5.6** as the model; select it explicitly for both your app's API calls and, where configurable, the Codex agent.

Two configuration layers matter:
- **AGENTS.md** — persistent, always-on instructions loaded at the start of every session in the repo. Use it for rules Codex cannot reliably infer and must always follow. It's version-controlled and consistent across CLI/IDE/cloud (Verdent guide, May 2026; OpenAI docs). Note it's *guidance*, not a hard constraint — an explicit prompt instruction can override it.
- **/review** and the diff panel — Codex can review its own diffs; you can click a row to feed feedback into the next turn (OpenAI docs, May 2026). At OpenAI, Codex reviews 100% of PRs, and teams get value from that only when their tests are good enough to make the review meaningful (smart-webtech).

## 3. The prompt shape that works (use it for every task)

OpenAI's own best-practices doc recommends four elements in every non-trivial Codex prompt: **Goal** (what "done" looks like in one concrete sentence), **Context** (which files, frameworks, errors matter — you can `@`-mention files), **Constraints** (standards, architecture, libraries, what not to touch), and the loop of **create tests, run checks, confirm, review** before you accept (developers.openai.com/codex/learn/best-practices). Community guides converge on the same four, often phrased **Goal / Context / Constraints / Done-when** (note.com masa_wunder; simi.studio; danielvaughan.com, all 2026). The failure mode they all warn about: humans underspecify because we write as if we'll be in the loop — with an agent you're not, and every missing constraint or acceptance criterion compounds over a long run (adityabawankule.io, May 2026).

Concrete constraints matter more than you'd think: if you don't say "React + Vite + TypeScript," Codex may pick a different stack on its own (note.com masa_wunder). The EqualVoice spec fixes the stack for exactly this reason — pass it through.

## 4. The workflow to run, start to finish

This is the spec-driven loop that current guides (simi.studio; medium/haldermans, Jun 2026) treat as the reliable path, adapted to your ~24 hours:

1. **Spec first.** You already have `equalvoice_build_spec.md`. That *is* your specification and source of truth. Codex works better transforming a written spec into code than chasing a moving conversation.
2. **AGENTS.md second.** Commit the starter in §9 before any code. Now every session starts with your data contracts, non-goals, and validation commands loaded.
3. **Plan before big steps.** For each roadmap step, ask Codex to read the repo and the spec and propose a short plan; approve or correct it, *then* let it implement. Cheap insurance against a wrong hour-long run.
4. **Small diffs, not one giant one.** Implement per roadmap step (§9 of the spec). Keep the app runnable after each.
5. **Tests as the contract.** For the coverage-scoring core, write the tests first, watch them fail, then have Codex implement until green. Tests are the external source of truth that lets the agent iterate without you second-guessing every diff (smart-webtech; getmaxim, 2026). This is also your strongest "non-trivial implementation" evidence — see §5.
6. **Review, then human-check.** Use `/review` on each diff; you inspect the high-risk parts (the matcher parsing, the assimilation-flagging logic).
7. **Capture learnings.** When you correct Codex on the same thing twice, move that rule into AGENTS.md instead of repeating it (simi.studio).

## 5. How to make the implementation *non-trivial* — and prove it

"Technological Implementation" rewards a working, non-trivial build, not a prompt wrapper. Aim Codex at the parts of EqualVoice that are genuinely engineering, and let those be the story:

- **The coverage-scoring engine (TDD).** Deterministic TypeScript that turns verdicts + gold labels into the report and the assimilation flags, including the *correct-compression control* (a diluted-but-low-consequence claim that must NOT be flagged). This is real logic with real edge cases and a real test suite. Build it test-first with Codex.
- **The matcher harness.** Robust JSON parsing, one-retry, error verdicts surfaced instead of crashes, low-temperature scoring, live→cache flow. This is the part that makes it an *evaluation tool*, not a summarizer — and evaluation layers are exactly what OpenAI's judges have rewarded (§7).
- **The demo/live split.** A cached demo mode that runs offline with no key, plus a live mode that regenerates verdicts. Judge-testability is a stated requirement; building both is a design *and* an implementation signal.
- **Let Codex do the multi-file, agentic work** — wiring the module to the UI, refactors, test scaffolding — rather than using it as autocomplete. The KDnuggets guide's framing (Mar 2026) is the bar: Codex acting like a strong engineer making coordinated changes across files and checking its own work.

Do NOT try to look impressive by adding clustering, embeddings, or a fixer. Depth on the eval core reads as more skillful than breadth of half-finished features — and the JetBrains x Codex hackathon writeup (Apr 2026) noted judges kept coming back to projects built to last past the demo (correctness, review, context), not the fastest flashy ones.

## 6. Session ID strategy (do this, it's a hard requirement)

You must submit the Codex Session ID for the session where the **majority of core functionality** was built. So:
- Decide up front that "core functionality" = the scoring engine + matcher harness + wiring (spec steps 1–3). Build those in **one sustained Codex session** so a single Session ID genuinely covers the core.
- Do scaffolding (step 0) and pure-polish (step 5) in separate sessions if you like; keep the meaty middle together.
- Grab the ID with `/feedback` at the end of that session and paste it into the submission. Don't lose it by starting a fresh session for a trivial fix and then forgetting which one held the core.

## 7. What OpenAI has praised, and the lesson for EqualVoice

Two recent Codex-hackathon winners are directly instructive:
- **Rippletide** won the Feb 2026 OpenAI Codex Hackathon (jury included Greg Brockman, Thibault Sottiaux, Peter Steinberger) with a continuously-running multi-agent research system. Their stated takeaway: agentic systems need **explicit evaluation** — prompting alone doesn't give enough control, and structured decision logic beats ad-hoc heuristics; the framing was "moving from outputs to outcomes: the decision layer" (rippletide.com, Feb 2026). EqualVoice *is* an evaluation/decision layer over LLM output — lean into that framing in your description and video, because it's demonstrably what these judges reward.
- **Yolodex** won $10k at the same event as an end-to-end pipeline that used Codex agents to automate a labor-intensive labeling workflow (createwith.com, Feb 2026). The lesson: a coherent pipeline that removes real manual toil scores well. EqualVoice removes the manual toil of checking, comment by comment, whether a summary dropped anyone.

Common thread across these and the Build Week tips: **a real, narrow problem; a working non-trivial system; visible, skillful Codex use; runnable by someone else.**

## 8. Templates you can paste

### "Where Codex accelerated this build" — README section
```
## Where Codex accelerated this build
- Model: GPT-5.6.  Agent: Codex (Session ID: <id>).
- Codex built the coverage-scoring engine test-first: I wrote acceptance
  criteria, Codex implemented until the suite passed, including the
  correct-compression control that prevents over-flagging.
- Codex implemented the matcher harness (defensive JSON parsing, retry,
  error surfacing) and wired the live→cached demo-mode flow across files.
- Codex reviewed each diff via /review; I human-checked the matcher parsing
  and the assimilation-flagging logic.
- Architectural decision Codex drove: <name one real one, e.g. the
  verdict-caching layer that makes demo mode run offline with no key>.
```

### 3-minute video beats (show Codex, not just the app)
1. 0:00–0:30 — the problem: a clean AI summary *looks* complete; one employee's accessibility need is gone. Hook with the side-by-side.
2. 0:30–1:30 — demo mode: the matrix, then the assimilation view; name it as graded dilution, not deletion.
3. 1:30–2:20 — how it's built: GPT-5.6 as summarizer + matcher; the scoring engine and its tests; **show a Codex diff or the /review panel** and say what Codex built.
4. 2:20–3:00 — honesty (same-model limitation, hand-labeled gold) and impact (who needs this). Close on the side-by-side.

### AGENTS.md starter (commit at repo root before coding)
```markdown
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
```

## 9. Sources
- OpenAI Codex best practices (official): developers.openai.com/codex/learn/best-practices
- Build Week overview & judge/tips: aimagazine.blog/posts/openai-build-week-win-100k-building-with-gpt-56-and-codex
- Codex workflows/TDD: smart-webtech.com; getmaxim.ai; dev.to/kuldeep_paul; kdnuggets.com
- AGENTS.md: verdent.ai/guides/codex-agents-md-explained; simi.studio/en/posts/codex-best-practices
- Prompt structure: note.com/masa_wunder; danielvaughan.com; adityabawankule.io
- Praised projects: rippletide.com (evaluation/decision layer); createwith.com (Yolodex); blog.jetbrains.com/ai (Apr 2026)

*Model versions shift fast; some guides reference GPT-5.5 as the Codex default, but Build Week requires GPT-5.6 — select it explicitly. Verify anything version-specific against the OpenAI docs before you rely on it.*
