import OpenAI from 'openai'

import type { CoverageStatus, CoverageVerdict } from '../scoring/coverage'

const MATCHER_PROMPT = `You are auditing whether a summary preserves a specific source claim.

SOURCE CLAIM (from one contributor):
"{claim.text}"

SUMMARY:
"{summary.text}"

Decide whether the summary preserves the SPECIFIC SUBSTANCE of the claim —
not merely whether the topic is mentioned, but whether a reader would still
understand the specific, consequential point this one contributor was making,
distinct from general themes.

Return ONLY this JSON, no prose:
{
  "status": "PRESERVED" | "DILUTED" | "OMITTED",
  "carrying_text": "<shortest span of the summary that carries it, or null>",
  "rationale": "<two sentences max>"
}
Use DILUTED when the topic appears but the specific consequential substance is
lost or recoded as a general/majority concern. Use OMITTED when even the topic
is absent. Use PRESERVED only when the specific substance is recoverable.`

interface MatcherResponse {
  status: CoverageStatus
  carrying_text: string | null
  rationale: string
}

class MatcherParseError extends Error {}

function errorVerdict(claimId: string, error: string): CoverageVerdict {
  return {
    claim_id: claimId,
    status: null,
    carrying_text: null,
    nearest_bullet: null,
    rationale: '',
    error,
  }
}

function isMatcherResponse(value: unknown): value is MatcherResponse {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const response = value as Record<string, unknown>

  return (
    (response.status === 'PRESERVED' ||
      response.status === 'DILUTED' ||
      response.status === 'OMITTED') &&
    (typeof response.carrying_text === 'string' || response.carrying_text === null) &&
    typeof response.rationale === 'string'
  )
}

function parseMatcherResponse(output: string): MatcherResponse {
  let parsed: unknown

  try {
    parsed = JSON.parse(output)
  } catch (error) {
    throw new MatcherParseError(error instanceof Error ? error.message : 'Invalid JSON.')
  }

  if (!isMatcherResponse(parsed)) {
    throw new MatcherParseError('Matcher response does not match the required JSON shape.')
  }

  return parsed
}

function findNearestBullet(summaryText: string, carryingText: string | null): string | null {
  if (carryingText === null) {
    return null
  }

  const lowerCarryingText = carryingText.toLocaleLowerCase()

  return (
    summaryText
      .split('\n')
      .map((line) => line.trim())
      .find((bullet) => bullet.toLocaleLowerCase().includes(lowerCarryingText)) ?? null
  )
}

export async function matchClaim(
  claimId: string,
  claimText: string,
  summaryText: string,
): Promise<CoverageVerdict> {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    return errorVerdict(claimId, 'OPENAI_API_KEY is not configured on the development server.')
  }

  const client = new OpenAI({ apiKey })
  const input = MATCHER_PROMPT.replace('{claim.text}', claimText).replace(
    '{summary.text}',
    summaryText,
  )
  let lastParseError = 'Matcher returned invalid JSON.'

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await client.responses.create({
        model: 'gpt-5.6',
        input,
        reasoning: { effort: 'none' },
      })
      const parsed = parseMatcherResponse(response.output_text)

      return {
        claim_id: claimId,
        status: parsed.status,
        carrying_text: parsed.carrying_text,
        nearest_bullet: findNearestBullet(summaryText, parsed.carrying_text),
        rationale: parsed.rationale,
        error: null,
      }
    } catch (error) {
      if (error instanceof Error) {
        lastParseError = error.message
      }

      if (!(error instanceof MatcherParseError)) {
        return errorVerdict(claimId, `Matcher request failed: ${lastParseError}`)
      }
    }
  }

  return errorVerdict(claimId, `Matcher returned invalid JSON after one retry: ${lastParseError}`)
}
