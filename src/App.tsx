import { useMemo, useState } from 'react'

import { cacheVerdicts, runLive } from './api/matcher'
import claims from '../fixtures/gold_claims.json'
import comments from '../fixtures/corpus.json'
import summary from '../fixtures/summary.json'
import demoVerdicts from '../fixtures/verdicts.json'
import { scoreReport, type Claim, type CoverageVerdict } from './scoring/coverage'
import './styles.css'

type RunMode = 'demo' | 'live'
type Status = 'PRESERVED' | 'DILUTED' | 'OMITTED' | 'UNSCORED'

const cachedDemoVerdicts = demoVerdicts as CoverageVerdict[]
const heroClaimId = 'C084.a'
const patternClaimIds = ['C012.a', 'C039.a', 'C061.a']

const lostSubstance: Record<string, string> = {
  'C084.a': 'accessibility accommodation and lost working time',
  'C012.a': 'reliable transit for arriving on time',
  'C039.a': 'week-to-week caregiving flexibility',
  'C061.a': 'commute costs that disproportionately reduce lower-paid workers’ take-home pay',
}

function statusClass(status: Status) {
  return `status status--${status.toLowerCase()}`
}

function renderInlineBold(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>
    }

    return part
  })
}

function App() {
  const [mode, setMode] = useState<RunMode>('demo')
  const [verdicts, setVerdicts] = useState<CoverageVerdict[]>(cachedDemoVerdicts)
  const [isRunning, setIsRunning] = useState(false)
  const [message, setMessage] = useState('Demo mode: cached verdicts loaded without a network request.')
  const [messageKind, setMessageKind] = useState<'info' | 'success' | 'error'>('info')

  const report = useMemo(
    () => scoreReport(verdicts, claims as Claim[], summary.summary_id),
    [verdicts],
  )
  const claimsById = useMemo(
    () => new Map((claims as Claim[]).map((claim) => [claim.claim_id, claim])),
    [],
  )
  const commentsById = useMemo(
    () => new Map(comments.map((comment) => [comment.comment_id, comment])),
    [],
  )
  const verdictsById = useMemo(
    () => new Map(report.verdicts.map((verdict) => [verdict.claim_id, verdict])),
    [report.verdicts],
  )
  const assimilationIds = report.assimilations
  const heroVerdict = verdictsById.get(heroClaimId)
  const heroClaim = claimsById.get(heroClaimId)
  const heroComment = heroClaim ? commentsById.get(heroClaim.comment_id) : undefined
  const patternVerdicts = patternClaimIds
    .map((claimId) => ({
      claim: claimsById.get(claimId),
      verdict: verdictsById.get(claimId),
    }))
    .filter(
      (item): item is { claim: Claim; verdict: CoverageVerdict } =>
        item.claim !== undefined && item.verdict !== undefined && assimilationIds.includes(item.claim.claim_id),
    )
  const sharedBullet = patternVerdicts[0]?.verdict.nearest_bullet

  async function handleModeChange(nextMode: RunMode) {
    setMode(nextMode)

    if (nextMode === 'demo') {
      setVerdicts(cachedDemoVerdicts)
      setMessage('Demo mode: cached verdicts loaded without a network request.')
      setMessageKind('info')
    } else {
      setMessage('Live mode uses GPT-5.6 and requires an OpenAI API Key on the local development server.')
      setMessageKind('info')
    }
  }

  async function handleLiveRun() {
    setIsRunning(true)
    setMessage('Running the matcher over cached claims (up to five requests at a time)…')
    setMessageKind('info')

    try {
      const nextVerdicts = await runLive(claims as Claim[], summary.text)
      setVerdicts(nextVerdicts)

      if (!nextVerdicts.every((verdict) => verdict.error === null)) {
        setMessage('Live run completed with error verdicts; the demo cache was not changed.')
        setMessageKind('error')
        return
      }

      try {
        await cacheVerdicts(nextVerdicts)
        setMessage('Live run completed and cached for future demo mode.')
        setMessageKind('success')
      } catch (error) {
        setMessage(
          `Live run completed. ${error instanceof Error ? error.message : 'Could not cache verdicts.'}`,
        )
        setMessageKind('error')
      }
    } catch (error) {
      setMessage(`Live run failed: ${error instanceof Error ? error.message : 'Unexpected error.'}`)
      setMessageKind('error')
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Summary coverage audit</p>
          <h1>EqualVoice</h1>
        </div>
        <div className="mode-control">
          <label htmlFor="run-mode">Run mode</label>
          <select
            id="run-mode"
            value={mode}
            disabled={isRunning}
            onChange={(event) => void handleModeChange(event.target.value as RunMode)}
          >
            <option value="demo">Demo · cached</option>
            <option value="live">Live matcher</option>
          </select>
          {mode === 'live' && (
            <button type="button" disabled={isRunning} onClick={() => void handleLiveRun()}>
              {isRunning ? 'Matching claims…' : 'Run live matcher'}
            </button>
          )}
        </div>
      </header>

      <p className={`mode-message mode-message--${messageKind}`} role="status" aria-live="polite">
        {isRunning && <span className="loading-dot" aria-hidden="true" />}
        {message}
      </p>

      <section className="explainer" aria-labelledby="explainer-heading">
        <div>
          <p className="eyebrow">How to read this audit</p>
          <h2 id="explainer-heading">EqualVoice evaluates a summary. It does not write one.</h2>
        </div>
        <p>
          Each hand-authored contributor claim is checked against a cached five-bullet summary. A claim can be
          preserved, diluted, or omitted. The most consequential non-preserved claims are flagged as
          assimilations: their topic appears, but the specific harm is no longer recoverable.
        </p>
      </section>

      {heroVerdict && heroClaim && heroComment && assimilationIds.includes(heroClaimId) && (
        <section className="hero" aria-labelledby="hero-heading">
          <div className="hero-heading">
            <p className="eyebrow">The finding</p>
            <h2 id="hero-heading">The topic survived. The consequence did not.</h2>
            <p>
              A facilities concern is visible in the summary, but this employee’s accessibility need
              and lost work hours are not.
            </p>
          </div>
          <div className="comparison comparison--hero">
            <article className="source-card">
              <p className="card-label">Original contributor comment</p>
              <blockquote>{heroComment.text}</blockquote>
              <p className="source-id">{heroComment.source_label} · {heroClaim.claim_id}</p>
            </article>
            <div className="assimilation-arrow" aria-label="Assimilated into a general theme">
              <span>assimilated</span><strong>→</strong>
            </div>
            <article className="summary-card">
              <p className="card-label">Summary bullet</p>
              <p>{renderInlineBold(heroVerdict.nearest_bullet ?? '')}</p>
            </article>
          </div>
          <p className="lost-label">
            <strong>Assimilated →</strong> {lostSubstance[heroClaimId]} no longer legible.
          </p>
          <p className="rationale">{heroVerdict.rationale}</p>
        </section>
      )}

      {patternVerdicts.length > 0 && sharedBullet && (
        <section className="pattern" aria-labelledby="pattern-heading">
          <div>
            <p className="eyebrow">Not a one-off</p>
            <h2 id="pattern-heading">Three distinct barriers collapse into one general line.</h2>
          </div>
          <div className="pattern-grid">
            <div className="needle-list">
              {patternVerdicts.map(({ claim, verdict }) => {
                const comment = commentsById.get(claim.comment_id)
                return (
                  <article className="needle-card" key={claim.claim_id}>
                    <p>{comment?.text}</p>
                    <span>assimilated → {lostSubstance[claim.claim_id]}</span>
                    <small>{renderInlineBold(verdict.rationale)}</small>
                  </article>
                )
              })}
            </div>
            <div className="many-to-one" aria-hidden="true">→</div>
            <article className="summary-card shared-summary">
              <p className="card-label">One summary bullet</p>
              <p>{renderInlineBold(sharedBullet ?? '')}</p>
            </article>
          </div>
        </section>
      )}

      <section className="matrix" aria-labelledby="matrix-heading">
        <div className="matrix-header">
          <div>
            <p className="eyebrow">Coverage matrix</p>
            <h2 id="matrix-heading">Every hand-authored claim, scored against the summary</h2>
          </div>
          <div className="counts" aria-label="Coverage counts">
            {(['PRESERVED', 'DILUTED', 'OMITTED'] as const).map((status) => (
              <div key={status} className={statusClass(status)}>
                <strong>{report.counts[status]}</strong><span>{status}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Claim</th><th>Status</th><th>Dimension</th><th>Consequence</th><th>Details</th></tr>
            </thead>
            <tbody>
              {(claims as Claim[]).map((claim) => {
                const verdict = verdictsById.get(claim.claim_id)
                const status = verdict?.status ?? 'UNSCORED'
                const isAssimilation = report.assimilations.includes(claim.claim_id)
                return (
                  <tr key={claim.claim_id} className={isAssimilation ? 'flagged-row' : undefined}>
                    <td><strong>{claim.claim_id}</strong><span>{claim.text}</span></td>
                    <td><span className={statusClass(status)}>{status}</span></td>
                    <td>{claim.dimension.replace(/_/g, ' ')}</td>
                    <td><span className={`consequence consequence--${claim.consequence}`}>{claim.consequence}</span></td>
                    <td>
                      <details>
                        <summary>{isAssimilation ? 'Flagged assimilation' : 'View evidence'}</summary>
                        <p><strong>Carrying text:</strong> {renderInlineBold(verdict?.carrying_text ?? 'None')}</p>
                        <p><strong>Rationale:</strong> {renderInlineBold(verdict?.rationale ?? verdict?.error ?? 'Not scored')}</p>
                        {claim.claim_id === 'C038.a' && <p className="control-note">Correct-compression control: low consequence, so not an assimilation.</p>}
                      </details>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}

export default App
