import type { Claim, CoverageVerdict } from '../scoring/coverage'

interface ApiError {
  error?: string
}

function clientErrorVerdict(claimId: string, error: string): CoverageVerdict {
  return {
    claim_id: claimId,
    status: null,
    carrying_text: null,
    nearest_bullet: null,
    rationale: '',
    error,
  }
}

export async function matchClaim(
  claim: Claim,
  summaryText: string,
): Promise<CoverageVerdict> {
  try {
    const response = await fetch('/api/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claim_text: claim.text, summary_text: summaryText }),
    })
    const payload = (await response.json()) as CoverageVerdict | ApiError

    if (!response.ok || !('claim_id' in payload)) {
      return clientErrorVerdict(
        claim.claim_id,
        `Matcher request failed: ${'error' in payload ? payload.error : response.statusText}`,
      )
    }

    return { ...payload, claim_id: claim.claim_id }
  } catch (error) {
    return clientErrorVerdict(
      claim.claim_id,
      `Matcher request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}

export async function runLive(
  claims: readonly Claim[],
  summaryText: string,
): Promise<CoverageVerdict[]> {
  const verdicts = new Array<CoverageVerdict>(claims.length)
  let nextIndex = 0

  async function worker() {
    while (nextIndex < claims.length) {
      const index = nextIndex
      nextIndex += 1
      verdicts[index] = await matchClaim(claims[index], summaryText)
    }
  }

  await Promise.all(Array.from({ length: Math.min(5, claims.length) }, worker))

  return verdicts
}

export async function cacheVerdicts(verdicts: readonly CoverageVerdict[]): Promise<void> {
  const response = await fetch('/api/verdicts/cache', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ verdicts }),
  })

  if (!response.ok) {
    const payload = (await response.json()) as ApiError
    throw new Error(payload.error ?? 'Could not cache live verdicts.')
  }
}
