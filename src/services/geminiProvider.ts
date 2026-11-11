import { TrustAnswer, TrustAnswerSchema } from '../types/trustAnswer'

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const SYSTEM_INSTRUCTION = `You are TrustLens AI, a claim-level trust verification assistant.
Respond to the user's question directly FIRST with conversational clarity, followed by atomic checkable claims and verified sources.

OUTPUT SPECIFICATION:
You must reply in valid JSON adhering to this exact format:
{
  "directAnswer": "A 2 to 5 sentence direct, helpful, real conversational answer FIRST. Place bracket citations like [1] directly after factual statements.",
  "details": "Optional markdown expansion with context.",
  "claims": [
    {
      "id": "C1",
      "text": "Exact atomic factual claim made in the direct answer",
      "confidence": "high | medium | low | verify",
      "status": "supported | partial | unverified | conflicting",
      "sourceIds": ["S1"],
      "note": "Documentary justification"
    }
  ],
  "sources": [
    {
      "id": "S1",
      "title": "Title of the authoritative publication or issuing authority",
      "publisher": "Issuing agency, university, or official body",
      "url": "https://...",
      "domain": "example.com",
      "snippet": "Verbatim or key excerpt supporting the claim",
      "type": "primary | secondary | general"
    }
  ],
  "uncertainties": [
    "Uncertainties, pending notices, or subjective conditions"
  ],
  "nextSteps": [
    "Independent verification checklist item before acting"
  ],
  "stakes": "low | medium | high",
  "followUps": [
    "Suggested follow-up question 1",
    "Suggested follow-up question 2",
    "Suggested follow-up question 3"
  ]
}

CRITICAL RULES:
1. Provide a direct, helpful answer to the user's question FIRST.
2. Break your answer into atomic claims linked to source ids.
3. If an assertion is time-sensitive (fees, dates), mark confidence as 'verify'.
4. Do NOT invent fake URLs. If a URL is uncertain, provide a clean domain reference.`

/**
 * Layer 1: Gemini API primary provider
 */
export async function callGeminiApi(
  question: string,
  history: Array<{ role: string; content: string }> = []
): Promise<TrustAnswer | null> {
  const env = import.meta.env
  const proxyUrl = env.VITE_PROXY_URL
  const apiKey = env.VITE_GEMINI_API_KEY

  if (!proxyUrl && (!apiKey || apiKey.trim() === '')) {
    return null
  }

  // If proxy URL is provided, call the proxy
  if (proxyUrl) {
    try {
      const res = await fetch(`${proxyUrl}/api/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, history })
      })
      if (res.ok) {
        const json = await res.json()
        const parsed = TrustAnswerSchema.parse({ ...json, provider: 'gemini' })
        return parsed
      }
    } catch (e) {
      console.warn('[geminiProvider] Proxy call failed, trying direct if key exists:', e)
    }
  }

  // Direct client-side Gemini API call
  const models = ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-2.0-flash']

  for (const model of models) {
    let retries = 0
    while (retries <= 2) {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 12000)

      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

        // Build contents
        const contents = [
          ...history.slice(-4).map(h => ({
            role: h.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: h.content }]
          })),
          {
            role: 'user',
            parts: [{ text: question }]
          }
        ]

        const reqBody: any = {
          contents,
          systemInstruction: {
            parts: [{ text: SYSTEM_INSTRUCTION }]
          },
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json'
          }
        }

        // Try with Google Search grounding if possible
        let response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...reqBody,
            tools: [{ googleSearch: {} }]
          }),
          signal: controller.signal
        })

        // If grounding fails with tool error/quota/400, retry immediately without tools
        if (!response.ok && (response.status === 400 || response.status === 429)) {
          const errText = await response.text().catch(() => '')
          if (errText.includes('tool') || errText.includes('googleSearch') || response.status === 400) {
            response = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(reqBody),
              signal: controller.signal
            })
          }
        }

        clearTimeout(timeoutId)

        if (response.status === 429) {
          retries++
          if (retries <= 2) {
            await sleep(1000 * Math.pow(2, retries))
            continue
          }
          break // switch model
        }

        if (response.status === 404) {
          // Model not found or deprecated, try next model
          break
        }

        if (!response.ok) {
          console.warn(`[geminiProvider] ${model} returned status ${response.status}`)
          break
        }

        const data = await response.json()
        const candidate = data?.candidates?.[0]
        const rawText = candidate?.content?.parts?.[0]?.text
        if (!rawText) break

        let parsed: any = null
        try {
          parsed = JSON.parse(rawText)
        } catch {
          const match = rawText.match(/\{[\s\S]*\}/)
          if (match) parsed = JSON.parse(match[0])
        }

        if (!parsed) break

        // Map grounding chunks if present
        const groundingChunks = candidate?.groundingMetadata?.groundingChunks
        if (Array.isArray(groundingChunks) && groundingChunks.length > 0) {
          const groundedSources = groundingChunks.map((chunk: any, i: number) => {
            const web = chunk.web || {}
            let domain = 'google.com'
            try {
              if (web.uri) domain = new URL(web.uri).hostname.replace(/^www\./, '')
            } catch {}
            return {
              id: `S${i + 1}`,
              title: web.title || `Source ${i + 1}`,
              publisher: domain,
              url: web.uri || '#',
              domain,
              snippet: web.title || 'Live grounded search reference.',
              type: 'primary' as const,
              retrievedAt: new Date().toISOString()
            }
          })
          parsed.sources = groundedSources
        }

        parsed.provider = 'gemini'
        const validated = TrustAnswerSchema.parse(parsed)
        return validated
      } catch (err: any) {
        clearTimeout(timeoutId)
        console.warn(`[geminiProvider] Error with model ${model}:`, err?.message || err)
        break
      }
    }
  }

  return null
}
