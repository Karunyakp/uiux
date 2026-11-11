import { TrustAnswer, Message } from '../types/trustAnswer'
import { callGeminiApi } from './geminiProvider'
import { callOpenSourceModel } from './openSourceProvider'
import { searchKnowledgeBase } from '../data/knowledgeBase'

/**
 * Single entry point for the 3-layer answer pipeline:
 * Layer 1: Gemini API (with Search Grounding, exponential backoff, model fallback)
 * Layer 2: Open-source model (OpenRouter / Ollama + Wikipedia REST API)
 * Layer 3: Offline Knowledge Base (Guaranteed answer with fuzzy scoring & honest fallback)
 */
export async function getAnswer(
  question: string,
  history: Message[] = []
): Promise<TrustAnswer> {
  const cleanQ = question.trim()
  if (!cleanQ) {
    return searchKnowledgeBase('')
  }

  const simplifiedHistory = history
    .filter(m => !m.pending && !m.error && m.content)
    .map(m => ({ role: m.role, content: m.content }))

  // Layer 1: Try Gemini API
  try {
    const geminiAnswer = await callGeminiApi(cleanQ, simplifiedHistory)
    if (geminiAnswer) {
      return geminiAnswer
    }
  } catch (err) {
    console.warn('[answerEngine] Layer 1 (Gemini) failed, falling through to Layer 2:', err)
  }

  // Layer 2: Try Open-Source / Local Model + Wikipedia
  try {
    const openSourceAnswer = await callOpenSourceModel(cleanQ, simplifiedHistory)
    if (openSourceAnswer) {
      return openSourceAnswer
    }
  } catch (err) {
    console.warn('[answerEngine] Layer 2 (Open Source) failed, falling through to Layer 3:', err)
  }

  // Layer 3: Offline Knowledge Base (Guaranteed)
  try {
    const offlineAnswer = searchKnowledgeBase(cleanQ)
    return offlineAnswer
  } catch (err) {
    console.error('[answerEngine] Layer 3 error, generating safe template fallback:', err)
    return {
      provider: 'offline',
      directAnswer: 'I reviewed your query, but could not retrieve verified records at this moment [1]. Please consult the official administering website or academic handbook directly [2].',
      claims: [
        {
          id: 'C1',
          text: 'Factual verification was unavailable during this session.',
          confidence: 'verify',
          status: 'unverified',
          sourceIds: ['S1']
        }
      ],
      sources: [
        {
          id: 'S1',
          title: 'Official Academic / Governing Portal',
          publisher: 'Authoritative Issuing Body',
          url: 'https://www.google.com',
          domain: 'google.com',
          snippet: 'Please verify requirements and schedules directly with primary official documentation.',
          type: 'general',
          retrievedAt: new Date().toISOString()
        }
      ],
      uncertainties: ['Live verification was unavailable and no cached offline record matched.'],
      nextSteps: ['Check official primary portal for latest announcements.'],
      stakes: 'medium',
      followUps: [
        'Can I apply for GATE 2027 if I’m in my 3rd year?',
        'How to make an ATS friendly resume for college placements?',
        'How to verify an AI answer before trusting it?'
      ]
    }
  }
}
