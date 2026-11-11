import { TrustAnswer, TrustAnswerSchema } from '../types/trustAnswer'

/**
 * Layer 2: Queries free open-source OpenAI-compatible endpoints or local Ollama,
 * and fetches real Wikipedia excerpts if sources are needed.
 */

interface WikipediaSummary {
  title: string
  extract: string
  content_urls?: {
    desktop?: {
      page?: string
    }
  }
}

/**
 * Fetches real, linkable encyclopedic sources via free Wikipedia REST API (CORS enabled, keyless).
 */
export async function fetchWikipediaEvidence(query: string): Promise<{ title: string; snippet: string; url: string; domain: string } | null> {
  try {
    const searchUrl = `https://en.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(query)}&limit=1`
    const searchRes = await fetch(searchUrl, { headers: { 'Api-User-Agent': 'TrustLensAI/1.0' } })
    if (!searchRes.ok) return null
    const searchData = await searchRes.json()
    const firstHit = searchData?.pages?.[0]
    if (!firstHit || !firstHit.key) return null

    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(firstHit.key)}`
    const sumRes = await fetch(summaryUrl, { headers: { 'Api-User-Agent': 'TrustLensAI/1.0' } })
    if (!sumRes.ok) return null
    const sumData: WikipediaSummary = await sumRes.json()

    return {
      title: sumData.title || firstHit.title,
      snippet: sumData.extract || firstHit.excerpt || 'Encyclopedic summary reference.',
      url: sumData.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(firstHit.key)}`,
      domain: 'en.wikipedia.org'
    }
  } catch (err) {
    console.warn('[openSourceProvider] Wikipedia lookup error:', err)
    return null
  }
}

const SYSTEM_PROMPT = `You are TrustLens AI, a claim-level trust verification assistant.
Respond to the user's question directly FIRST, followed by atomic checkable claims and verified sources.
You must respond with valid JSON ONLY matching this exact schema:
{
  "directAnswer": "2 to 5 sentence direct, helpful, conversational answer to the question first. Embed brackets like [1] after key facts.",
  "details": "Optional markdown expansion with context.",
  "claims": [
    {
      "id": "C1",
      "text": "Exact atomic factual claim made in your answer",
      "confidence": "high | medium | low | verify",
      "status": "supported | partial | unverified | conflicting",
      "sourceIds": ["S1"],
      "note": "Brief explanation of evidence basis"
    }
  ],
  "sources": [
    {
      "id": "S1",
      "title": "Title of authoritative publication or authority",
      "publisher": "Issuing organization or authority",
      "url": "https://...",
      "domain": "example.com",
      "snippet": "Verbatim or key excerpt supporting the claim",
      "type": "primary | secondary | general"
    }
  ],
  "uncertainties": [
    "Important clauses, pending notifications, or ambiguities"
  ],
  "nextSteps": [
    "Recommended verification action before acting or paying"
  ],
  "stakes": "low | medium | high",
  "followUps": [
    "Suggested follow up question 1",
    "Suggested follow up question 2",
    "Suggested follow up question 3"
  ]
}
RULES:
1. Provide a direct, helpful, real answer FIRST.
2. Break your answer into atomic claims linked to source ids.
3. If an assertion is time-sensitive (fees, dates), mark confidence as 'verify'.
4. Do NOT invent fake URLs. If a URL is uncertain, provide a clean domain reference.`

/**
 * Attempts calling OpenRouter / OpenAI-compatible endpoint or local Ollama.
 */
export async function callOpenSourceModel(question: string, history: Array<{ role: string; content: string }> = []): Promise<TrustAnswer | null> {
  const env = import.meta.env
  const fallbackUrl = env.VITE_FALLBACK_API_URL || (env.VITE_OLLAMA_MODEL ? 'http://localhost:11434/v1/chat/completions' : null)
  const apiKey = env.VITE_FALLBACK_API_KEY || 'none'
  const model = env.VITE_FALLBACK_MODEL || env.VITE_OLLAMA_MODEL || 'meta-llama/llama-3.3-70b-instruct:free'

  if (!fallbackUrl) {
    return null
  }

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.slice(-4).map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: question }
  ]

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 12000)

  try {
    const res = await fetch(fallbackUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey && apiKey !== 'none' ? { Authorization: `Bearer ${apiKey}` } : {})
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
        response_format: { type: 'json_object' }
      }),
      signal: controller.signal
    })

    clearTimeout(timeoutId)
    if (!res.ok) {
      console.warn(`[openSourceProvider] Endpoint returned status ${res.status}`)
      return null
    }

    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content
    if (!content) return null

    // Extract JSON
    let parsed: any = null
    try {
      parsed = JSON.parse(content)
    } catch {
      const match = content.match(/\{[\s\S]*\}/)
      if (match) {
        parsed = JSON.parse(match[0])
      }
    }

    if (!parsed) return null

    // If model returned no sources or empty sources, try augmenting with real Wikipedia evidence
    if (!Array.isArray(parsed.sources) || parsed.sources.length === 0) {
      const wiki = await fetchWikipediaEvidence(question)
      if (wiki) {
        parsed.sources = [
          {
            id: 'S1',
            title: `${wiki.title} (Wikipedia Reference)`,
            publisher: 'Wikimedia Foundation',
            url: wiki.url,
            domain: wiki.domain,
            snippet: wiki.snippet,
            type: 'secondary',
            retrievedAt: new Date().toISOString()
          }
        ]
        if (Array.isArray(parsed.claims)) {
          parsed.claims.forEach((c: any) => {
            if (!c.sourceIds || c.sourceIds.length === 0) c.sourceIds = ['S1']
          })
        }
      }
    }

    parsed.provider = 'open-model'
    const validated = TrustAnswerSchema.parse(parsed)
    return validated
  } catch (err: any) {
    clearTimeout(timeoutId)
    console.warn('[openSourceProvider] Call failed or timed out:', err?.message || err)
    return null
  }
}
