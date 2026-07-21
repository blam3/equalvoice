# EqualVoice

When an AI summarizes many people's feedback into a few bullets, it rarely
deletes a marginalized voices (e.g., LGBTQ+, people with disabilities) outright — it **assimilates** it: the topic
is included in the summary, but the specific, consequential substance gets recoded as something
the majority also wanted. An employee's disability accommodation need becomes a
generic "quiet zones" line; three distinct equity barriers collapse into one
"manage flexibility" bullet. The summary looks complete, so no one notices what
was flattened. EqualVoice is an **evaluation layer** — not another summarizer —
that audits a summary claim by claim against the original contributions, scores
each as PRESERVED / DILUTED / OMITTED with a GPT-5.6 matcher, and surfaces the
high-consequence cases where a real concern was assimilated into a majority
theme. It's built for anyone who summarizes many voices for making decisions: HR,
product research, public consultation, community management.

EqualVoice is an **evaluation layer for AI summaries**, not another summarizer. It audits whether a compressed summary preserves the specific substance of every contributor's claim—and makes it easy to spot an especially subtle failure: **assimilation**.

In the included employee-feedback demo, a contributor's accessibility need is not deleted outright. The summary mentions noise and quiet zones, but the need for an accommodation—and the resulting lost work time—is no longer legible. EqualVoice makes that difference visible.

## Run the demo (no API key required)

Requirements: Node.js 20 or newer.

```bash
git clone https://github.com/blam3/equalvoice
cd EqualVoice
npm install
npm run dev
```

Open the local URL shown by Vite. The app starts in **Demo · cached** mode and works offline with no `OPENAI_API_KEY`. It loads committed fixture data, so the demo is instant and repeatable.

To verify the project before sharing it:

```
bash
npm test
npm run lint
npm run typecheck
```

## What to look at first

1. The hero comparison: read the original employee comment beside the summary bullet.
2. The gold callout: it names what became unrecoverable—an accessibility accommodation and lost working time.
3. The pattern view: several distinct barriers can collapse into a single general summary theme.
4. The matrix: every hand-authored claim is marked `PRESERVED`, `DILUTED`, or `OMITTED`, with the evidence and rationale available inline.

## How it works

The repository includes a cached corpus of 100 employee comments, one cached five-bullet executive summary, and one hand-authored gold claim per comment. In demo mode, EqualVoice loads cached matcher verdicts. Its deterministic TypeScript scoring module aggregates those verdicts and flags high-consequence claims that are not preserved as assimilations.

Live mode is available from the UI for development demonstrations. With `OPENAI_API_KEY` configured on the local development server, it calls GPT-5.6 once per cached claim to re-run the claim-level matcher. Demo mode remains the default and never needs a key or network access.

The content dimensions used in the fixture are informed by ADDRESSING as an internal scaffold. They describe the content of a claim—not the identity of its contributor—and are not a claim about any contributor's identity.

## Honesty and limitations

1. **This is graded dilution, not deletion.** The tool does not claim the
   summarizer "erased" anyone. In every flagged case the *topic* survives in
   the summary — the specific, consequential substance is what's lost. The
   disability example (C084) is the sharpest: a lighting/noise accommodation
   that costs the employee work hours is folded into a generic open-plan-noise
   facilities bullet. The topic looks covered, which is exactly why a human
   reader misses it.
2. **Gold claims and consequence labels are hand-authored, on purpose.** The
   100 claims and their `dimension` / `consequence` tags were written by a
   human, not extracted or ranked by a model. This keeps the evaluation
   non-circular: the tool never asks the summarizer to decide which voices
   matter, and the four high-consequence "needles" (transit, caregiving, cost,
   disability access) were flagged for consequence *before* any verdict was
   computed.
3. **Same-model limitation.** GPT-5.6 both writes the summary and judges the
   coverage. We have a real case where the matcher (GPT-5.6) returned OMITTED
   on the disability claim that the summarizer (GPT-5.6) had assimilated — so
   the pipeline can detect its own failure mode — but this is one encouraging
   result, not a full validation. Independent-matcher validation (a different
   model as judge) and human-agreement checks are the honest next step.

The `dimension` categories are grounded in Pamela Hays' ADDRESSING framework,
used internally to justify *why* these consequence categories rather than
ad-hoc ones. It tags the content dimension of each claim, never a
contributor's identity, and is deliberately kept out of the UI to avoid
inviting a stereotyping/proxy reading.

## Demo-recording guide (under 3 minutes)

Keep the app in its default **Demo · cached** mode so the recording needs no API key or network.

1. Open with: “EqualVoice evaluates AI summaries; it does not generate them.”
2. Read the hero's original comment and summary bullet, then point to the lost accessibility accommodation and work time.
3. Show the three-to-one pattern and explain that this is graded dilution: a topic remains while a consequential minority claim is recoded as a general concern.
4. Briefly open one matrix row to show the carrying text and rationale, including the low-consequence correct-compression control.
5. Close with the limitation: the gold claims are hand-authored and the current matcher uses the same model family; independent and human validation are the next steps.

## Where Codex accelerated this build

- **Model:** GPT-5.6. **Agent:** Codex. **Core Session ID:** `019f8390-4fe2-7430-a327-1fb98570556e`

- **Scoring engine, test-first.** I wrote the acceptance criteria as unit
  tests — all-preserved, one diluted high-consequence claim, one omitted, and
  a *correct-compression control* (a diluted-but-low-consequence claim that
  must NOT be flagged) — and Codex implemented the pure `scoreReport` /
  `flagAssimilations` logic in `src/scoring/coverage.ts` until the suite passed
  at 100% branch coverage. The control test is what proves the tool isn't just
  flagging everything.

- **Matcher harness.** Codex built the claim-level GPT-5.6 matcher with
  defensive JSON parsing, a one-retry-then-surface-an-error path (bad model
  output becomes a visible error verdict, never a crash), and low-temperature
  scoring for stability across runs.

- **Demo/live split across files.** Codex wired the live→cached flow: live mode
  calls the matcher over the 100-claim corpus and writes `fixtures/verdicts.json`;
  demo mode reads that cache and runs fully offline with no API key. This is
  what makes the project judge-testable without setup.

- **Architectural decisions Codex drove:**
  - Keeping the OpenAI key server-side via a Vite dev-server middleware
    (`POST /api/match`) so the browser never sees it, instead of a second
    standalone server.
  - Mapping the pinned 3-field matcher response into the existing
    `CoverageVerdict` type rather than redefining it, which kept the
    already-passing scoring tests valid.

- **Review loop.** Codex reviewed each diff via `/review`; I human-checked the
  two highest-risk parts myself — the matcher parse/retry logic and the
  assimilation-flagging rule (high-consequence AND non-PRESERVED).
## Project structure

- `fixtures/` — committed corpus, summary, hand-authored gold claims, and cached verdicts for demo mode.
- `src/scoring/coverage.ts` — pure deterministic coverage aggregation.
- `src/api/matcher.ts` and `src/server/matcher.ts` — live GPT-5.6 matcher path.
- `src/App.tsx` — demo UI: assimilation comparison, pattern view, and coverage matrix.

## Track

OpenAI Build Week — **Work & Productivity**.
