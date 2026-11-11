import { z } from 'zod'

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'verify'
export type ClaimStatus = 'supported' | 'partial' | 'unverified' | 'conflicting'
export type SourceType = 'primary' | 'secondary' | 'general'
export type StakesLevel = 'low' | 'medium' | 'high'
export type ProviderType = 'gemini' | 'open-model' | 'offline'

export interface Claim {
  id: string
  text: string
  confidence: ConfidenceLevel
  status: ClaimStatus
  sourceIds: string[]
  note?: string
}

export interface Source {
  id: string
  title: string
  publisher: string
  url: string
  domain: string
  snippet: string
  type: SourceType
  retrievedAt: string
}

export interface TrustAnswer {
  provider: ProviderType
  directAnswer: string
  details?: string
  claims: Claim[]
  sources: Source[]
  uncertainties: string[]
  nextSteps: string[]
  stakes: StakesLevel
  followUps: string[]
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
  trustAnswer?: TrustAnswer
  pending?: boolean
  error?: boolean
  attachments?: any[]
}

export const ClaimSchema = z.object({
  id: z.string(),
  text: z.string(),
  confidence: z.enum(['high', 'medium', 'low', 'verify']),
  status: z.enum(['supported', 'partial', 'unverified', 'conflicting']),
  sourceIds: z.array(z.string()).default([]),
  note: z.string().optional()
})

export const SourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  publisher: z.string(),
  url: z.string(),
  domain: z.string().default(''),
  snippet: z.string(),
  type: z.enum(['primary', 'secondary', 'general']).default('general'),
  retrievedAt: z.string().default(() => new Date().toISOString())
})

export const TrustAnswerSchema = z.object({
  provider: z.enum(['gemini', 'open-model', 'offline']).default('offline'),
  directAnswer: z.string().min(1),
  details: z.string().optional(),
  claims: z.array(ClaimSchema).default([]),
  sources: z.array(SourceSchema).default([]),
  uncertainties: z.array(z.string()).default([]),
  nextSteps: z.array(z.string()).default([]),
  stakes: z.enum(['low', 'medium', 'high']).default('medium'),
  followUps: z.array(z.string()).default([])
})
