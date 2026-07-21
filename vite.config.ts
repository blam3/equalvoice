import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { readFile, rename, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { matchClaim } from './src/server/matcher'

const verdictsPath = fileURLToPath(new URL('./fixtures/verdicts.json', import.meta.url))

interface MatchRequest {
  claim_text: string
  summary_text: string
}

function isMatchRequest(value: unknown): value is MatchRequest {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const request = value as Record<string, unknown>
  return typeof request.claim_text === 'string' && typeof request.summary_text === 'string'
}

async function readJsonBody(request: import('node:http').IncomingMessage): Promise<unknown> {
  let body = ''

  for await (const chunk of request) {
    body += chunk
  }

  return JSON.parse(body)
}

function sendJson(response: import('node:http').ServerResponse, status: number, body: unknown) {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json')
  response.end(JSON.stringify(body))
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  process.env.OPENAI_API_KEY ??= env.OPENAI_API_KEY

  return {
    plugins: [
      react(),
      {
        name: 'equalvoice-matcher-api',
        configureServer(server) {
          server.middlewares.use(async (request, response, next) => {
          if (request.method === 'POST' && request.url === '/api/match') {
            try {
              const body = await readJsonBody(request)

              if (!isMatchRequest(body)) {
                sendJson(response, 400, { error: 'Expected claim_text and summary_text strings.' })
                return
              }

              sendJson(
                response,
                200,
                await matchClaim('server-request', body.claim_text, body.summary_text),
              )
            } catch (error) {
              sendJson(response, 400, {
                error: error instanceof Error ? error.message : 'Invalid request body.',
              })
            }
            return
          }

          if (request.method === 'POST' && request.url === '/api/verdicts/cache') {
            try {
              const body = await readJsonBody(request)
              const verdicts =
                typeof body === 'object' && body !== null
                  ? (body as { verdicts?: unknown }).verdicts
                  : undefined

              if (!Array.isArray(verdicts)) {
                sendJson(response, 400, { error: 'Expected a verdicts array.' })
                return
              }

              const existing = await readFile(verdictsPath, 'utf8')
              if (existing.trim() !== '[]') {
                sendJson(response, 409, { error: 'Cached verdicts already exist.' })
                return
              }

              const temporaryPath = `${verdictsPath}.tmp`
              await writeFile(temporaryPath, `${JSON.stringify(verdicts, null, 2)}\n`)
              await rename(temporaryPath, verdictsPath)
              sendJson(response, 201, { ok: true })
            } catch (error) {
              sendJson(response, 500, {
                error: error instanceof Error ? error.message : 'Could not cache verdicts.',
              })
            }
            return
          }

          next()
          })
        },
      },
    ],
  }
})
