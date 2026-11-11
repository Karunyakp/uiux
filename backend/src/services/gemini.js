import { GoogleGenAI } from '@google/genai'
import { config } from '../config.js'
import { HttpError } from '../lib/http.js'

let clientInstance = null

function getClient() {
  if (!config.geminiApiKey) return null
  if (!clientInstance) {
    clientInstance = new GoogleGenAI({ apiKey: config.geminiApiKey })
  }
  return clientInstance
}

const withTimeout = (promise, ms = 35000, opName = 'Gemini API call') => {
  let timer
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new HttpError(504, `${opName} timed out after ${Math.round(ms / 1000)} seconds. Please try again.`)), ms)
    })
  ]).finally(() => clearTimeout(timer))
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Sanitizes any raw SDK error or JSON string into a clear, professional error message.
 */
export function cleanGeminiErrorMessage(err) {
  if (!err) return 'Gemini service temporarily unavailable.'
  const raw = String(err.message || err)

  // Try extracting inner JSON if present: {"error":{"code":503,"message":"...","status":"UNAVAILABLE"}}
  try {
    const jsonMatch = raw.match(/\{[\s\S]*"error"[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      if (parsed.error?.message) {
        const inner = parsed.error.message
        if (inner.includes('high demand') || parsed.error.status === 'UNAVAILABLE' || parsed.error.code === 503) {
          return 'The AI model is currently experiencing high demand. Spikes are usually temporary; please retry in a few moments.'
        }
        return inner
      }
    }
  } catch {}

  if (raw.includes('high demand') || raw.includes('UNAVAILABLE') || raw.includes('503')) {
    return 'The AI model is currently experiencing high demand. Spikes are usually temporary; please retry in a few moments.'
  }
  if (raw.includes('API_KEY_INVALID') || raw.includes('API key not valid')) {
    return 'The provided GEMINI_API_KEY is invalid. Please verify the key in backend/.env.'
  }
  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429') || raw.includes('quota')) {
    return 'Gemini API rate limit reached. Please wait a few moments and try again.'
  }
  if (raw.includes('ENOTFOUND') || raw.includes('fetch failed')) {
    return 'Unable to reach Google Gemini API servers. Please check your internet connection.'
  }
  if (raw.includes('timed out')) {
    return 'The request to Gemini API timed out while verifying sources. Please retry.'
  }

  // Strip raw JSON and clean up
  const clean = raw.replace(/\{[\s\S]*\}/, '').replace(/^Gemini API service error:\s*/i, '').trim()
  return clean || 'Gemini API service is momentarily unavailable. Please retry in a few moments.'
}

/**
 * Executes a Gemini request with Google Search grounding and system instructions.
 * Gracefully handles missing API key, rate limits, network errors, high-demand spikes, and grounding metadata.
 */
export async function callGemini({
  prompt,
  history = [],
  attachments = [],
  systemInstruction,
  enableSearch = true
}) {
  const client = getClient()
  if (!client) {
    const error = new HttpError(503, 'GEMINI_API_KEY is not configured in backend/.env')
    error.code = 'NO_API_KEY'
    throw error
  }

  const candidateModels = [
    config.geminiModel,
    'gemini-3.8-flash',
    'gemini-3.5-flash'
  ].filter(Boolean)
  // Deduplicate candidate models
  const uniqueModels = [...new Set(candidateModels)]

  // Build multi-turn contents from history
  const contents = []
  if (Array.isArray(history) && history.length > 0) {
    for (const msg of history) {
      if (!msg.content) continue
      const role = msg.role === 'assistant' ? 'model' : 'user'
      contents.push({
        role,
        parts: [{ text: String(msg.content) }]
      })
    }
  }

  // Build user message parts (text + attachments)
  const userParts = [{ text: String(prompt || 'Please analyze the attached file.') }]

  if (Array.isArray(attachments) && attachments.length > 0) {
    for (const att of attachments) {
      if (!att.data) continue
      const commaIdx = att.data.indexOf(',')
      const base64Data = commaIdx !== -1 ? att.data.slice(commaIdx + 1) : att.data
      const mime = att.type || 'application/octet-stream'

      if (mime.startsWith('image/') || mime === 'application/pdf') {
        userParts.push({
          inlineData: {
            mimeType: mime,
            data: base64Data
          }
        })
      } else if (mime.startsWith('text/') || att.name?.endsWith('.txt')) {
        const textVal = Buffer.from(base64Data, 'base64').toString('utf-8')
        userParts.push({
          text: `\n[Attached File: ${att.name}]\n${textVal}\n`
        })
      } else {
        try {
          const rawBuf = Buffer.from(base64Data, 'base64')
          const cleanText = rawBuf.toString('utf-8').replace(/[^\x20-\x7E\t\r\n]/g, ' ').replace(/\s{2,}/g, ' ')
          if (cleanText.trim().length > 20) {
            userParts.push({
              text: `\n[Attached File Content: ${att.name}]\n${cleanText.slice(0, 15000)}\n`
            })
          }
        } catch {}
      }
    }
  }

  contents.push({
    role: 'user',
    parts: userParts
  })

  const reqConfig = {
    systemInstruction: systemInstruction || undefined
  }

  try {
    let response = null
    let groundingMetadata = null
    let successfulModel = uniqueModels[0] || 'gemini-3.5-flash'

    // Try candidate models in order of preference
    let lastError = null
    for (const currentModel of uniqueModels) {
      try {
        // Attempt search-grounded generation first if enabled
        if (enableSearch) {
          try {
            response = await withTimeout(client.models.generateContent({
              model: currentModel,
              contents,
              config: {
                ...reqConfig,
                tools: [{ googleSearch: {} }]
              }
            }), 25000, `Search-grounded verification (${currentModel})`)
            groundingMetadata = response.candidates?.[0]?.groundingMetadata || null
            successfulModel = currentModel
            break
          } catch (groundingErr) {
            console.warn(`[gemini] Google Search tool on ${currentModel} encountered limit/error: ${groundingErr.message?.slice(0, 80)}. Falling back to direct model generation.`)
          }
        }

        // Direct model generation (without tools)
        response = await withTimeout(client.models.generateContent({
          model: currentModel,
          contents,
          config: reqConfig
        }), 25000, `Model verification generation (${currentModel})`)
        groundingMetadata = response.candidates?.[0]?.groundingMetadata || null
        successfulModel = currentModel
        break
      } catch (modelErr) {
        lastError = modelErr
        const emsg = String(modelErr.message || modelErr)
        console.warn(`[gemini] Model ${currentModel} error (${modelErr.status || 'unknown'}): ${emsg.slice(0, 100)}. Checking next available model...`)
        // Short pause between model attempts if rate limited or high demand
        if (emsg.includes('503') || emsg.includes('429')) {
          await sleep(600)
        }
      }
    }

    if (!response) {
      throw lastError || new Error('All Gemini model candidates were unavailable.')
    }

    const candidate = response.candidates?.[0]
    const text = response.text || candidate?.content?.parts?.map(p => p.text).filter(Boolean).join('\n') || ''

    return {
      text,
      groundingMetadata,
      usage: response.usageMetadata || null,
      model: successfulModel
    }
  } catch (err) {
    const cleanMsg = cleanGeminiErrorMessage(err)
    const rawMsg = String(err.message || err)

    if (rawMsg.includes('API_KEY_INVALID') || rawMsg.includes('API key not valid')) {
      throw new HttpError(401, cleanMsg)
    } else if (rawMsg.includes('RESOURCE_EXHAUSTED') || rawMsg.includes('429')) {
      throw new HttpError(429, cleanMsg)
    } else if (rawMsg.includes('503') || rawMsg.includes('high demand') || rawMsg.includes('UNAVAILABLE')) {
      const httpErr = new HttpError(503, cleanMsg)
      httpErr.isHighDemand = true
      throw httpErr
    } else if (rawMsg.includes('ENOTFOUND') || rawMsg.includes('fetch failed')) {
      throw new HttpError(502, cleanMsg)
    } else if (rawMsg.includes('timed out')) {
      throw new HttpError(504, cleanMsg)
    } else {
      throw new HttpError(502, cleanMsg)
    }
  }
}
