import assert from 'node:assert/strict'
import test from 'node:test'
import {
  flagAssimilations,
  scoreReport,
  type Claim,
  type CoverageVerdict,
} from '../src/scoring/coverage.js'

const claim = (overrides: Partial<Claim> = {}): Claim => ({
  claim_id: 'C001.a',
  comment_id: 'C001',
  text: 'A source claim.',
  dimension: 'environment_focus',
  consequence: 'medium',
  ...overrides,
})

const verdict = (overrides: Partial<CoverageVerdict> = {}): CoverageVerdict => ({
  claim_id: 'C001.a',
  status: 'PRESERVED',
  carrying_text: 'A matching summary span.',
  nearest_bullet: 'A matching summary bullet.',
  rationale: 'The claim remains recoverable.',
  error: null,
  ...overrides,
})

test('scores an all-preserved report without assimilations', () => {
  const claims = [
    claim({ claim_id: 'C001.a', consequence: 'high' }),
    claim({ claim_id: 'C002.a', comment_id: 'C002', consequence: 'low' }),
  ]
  const verdicts = [
    verdict({ claim_id: 'C001.a' }),
    verdict({ claim_id: 'C002.a' }),
  ]

  const report = scoreReport(verdicts, claims)

  assert.deepEqual(report.counts, {
    PRESERVED: 2,
    DILUTED: 0,
    OMITTED: 0,
  })
  assert.equal(report.summary_id, 'S1')
  assert.equal(report.unscored, 0)
  assert.deepEqual(report.assimilations, [])
})

test('flags a high-consequence diluted claim as an assimilation', () => {
  const highConsequenceClaim = claim({
    claim_id: 'C052.a',
    comment_id: 'C052',
    dimension: 'caregiving_schedule',
    consequence: 'high',
  })
  const dilutedVerdict = verdict({
    claim_id: 'C052.a',
    status: 'DILUTED',
    carrying_text: 'Support more flexible schedules.',
    nearest_bullet: 'Support more flexible schedules.',
  })

  const report = scoreReport([dilutedVerdict], [highConsequenceClaim])

  assert.equal(report.counts.DILUTED, 1)
  assert.deepEqual(report.assimilations, ['C052.a'])
  assert.deepEqual(flagAssimilations([dilutedVerdict], [highConsequenceClaim]), ['C052.a'])
})

test('counts and flags a high-consequence omitted claim', () => {
  const disabilityClaim = claim({
    claim_id: 'C037.a',
    comment_id: 'C037',
    dimension: 'disability_access',
    consequence: 'high',
  })
  const omittedVerdict = verdict({
    claim_id: 'C037.a',
    status: 'OMITTED',
    carrying_text: null,
    nearest_bullet: 'Expand quiet zones to improve focus.',
  })

  const report = scoreReport([omittedVerdict], [disabilityClaim])

  assert.equal(report.counts.OMITTED, 1)
  assert.deepEqual(report.assimilations, ['C037.a'])
  assert.equal(report.verdicts[0]?.carrying_text, null)
  assert.equal(report.verdicts[0]?.nearest_bullet, 'Expand quiet zones to improve focus.')
})

test('does not flag a redundant low-consequence diluted claim', () => {
  const redundantClaim = claim({
    claim_id: 'C099.a',
    comment_id: 'C099',
    dimension: 'operations_logistics',
    consequence: 'low',
  })
  const dilutedControlVerdict = verdict({
    claim_id: 'C099.a',
    status: 'DILUTED',
    carrying_text: 'Improve office operations.',
    nearest_bullet: 'Improve office operations.',
  })

  const report = scoreReport([dilutedControlVerdict], [redundantClaim])

  assert.equal(report.counts.DILUTED, 1)
  assert.deepEqual(report.assimilations, [])
})

test('reports error verdicts as unscored without counting or flagging them', () => {
  const errorVerdict = verdict({
    status: null,
    carrying_text: null,
    nearest_bullet: null,
    rationale: '',
    error: 'Matcher returned invalid JSON after retry.',
  })

  const report = scoreReport([errorVerdict], [claim({ consequence: 'high' })])

  assert.deepEqual(report.counts, {
    PRESERVED: 0,
    DILUTED: 0,
    OMITTED: 0,
  })
  assert.equal(report.unscored, 1)
  assert.deepEqual(report.assimilations, [])
})
