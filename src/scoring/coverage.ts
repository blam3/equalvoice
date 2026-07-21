export type Consequence = 'high' | 'medium' | 'low'

export type Dimension =
  | 'disability_access'
  | 'socioeconomic_cost'
  | 'caregiving_schedule'
  | 'transit_access'
  | 'environment_focus'
  | 'collaboration_culture'
  | 'onboarding_mentorship'
  | 'operations_logistics'

export interface Claim {
  claim_id: string
  comment_id: string
  text: string
  dimension: Dimension
  consequence: Consequence
}

export type CoverageStatus = 'PRESERVED' | 'DILUTED' | 'OMITTED'

export interface CoverageVerdict {
  claim_id: string
  status: CoverageStatus | null
  carrying_text: string | null
  nearest_bullet: string | null
  rationale: string
  error: string | null
}

export interface CoverageCounts {
  PRESERVED: number
  DILUTED: number
  OMITTED: number
}

export interface CoverageReport {
  summary_id: string
  verdicts: CoverageVerdict[]
  counts: CoverageCounts
  unscored: number
  assimilations: string[]
}

const createEmptyCounts = (): CoverageCounts => ({
  PRESERVED: 0,
  DILUTED: 0,
  OMITTED: 0,
})

export function flagAssimilations(
  verdicts: readonly CoverageVerdict[],
  goldClaims: readonly Claim[],
): string[] {
  const claimsById = new Map(goldClaims.map((claim) => [claim.claim_id, claim]))

  return verdicts
    .filter((verdict) => {
      const claim = claimsById.get(verdict.claim_id)

      return (
        claim?.consequence === 'high' &&
        (verdict.status === 'DILUTED' || verdict.status === 'OMITTED')
      )
    })
    .map((verdict) => verdict.claim_id)
}

export function scoreReport(
  verdicts: readonly CoverageVerdict[],
  goldClaims: readonly Claim[],
  summaryId = 'S1',
): CoverageReport {
  const counts = createEmptyCounts()
  let unscored = 0

  for (const verdict of verdicts) {
    if (verdict.status === null) {
      unscored += 1
      continue
    }

    counts[verdict.status] += 1
  }

  return {
    summary_id: summaryId,
    verdicts: [...verdicts],
    counts,
    unscored,
    assimilations: flagAssimilations(verdicts, goldClaims),
  }
}
