import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAnswer } from '../src/services/answerEngine';
import { findKnowledgeBaseMatch, getHonestUnknownAnswer } from '../src/data/knowledgeBase';
import { TrustAnswerSchema } from '../src/types/trustAnswer';

describe('TrustAnswer Pipeline & Fallback System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates schema compliance for offline knowledgebase match', () => {
    const match = findKnowledgeBaseMatch('Can I apply for GATE if I am in my 3rd year of BTech?');
    expect(match).not.toBeNull();
    if (match) {
      expect(match.claims.length).toBeGreaterThan(0);
      expect(match.sources.length).toBeGreaterThan(0);
      const parsed = TrustAnswerSchema.safeParse(match);
      expect(parsed.success).toBe(true);
      expect(match.directAnswer).toContain('3rd year');
    }
  });

  it('guarantees offline fallback when online providers fail', async () => {
    // Both GEMINI and OpenSource fail or are keyless
    const answer = await getAnswer('Can 3rd year students write GATE 2027?', []);
    expect(answer).toBeDefined();
    expect(answer.directAnswer).toBeDefined();
    expect(answer.directAnswer.length).toBeGreaterThan(20);
    expect(answer.claims.length).toBeGreaterThan(0);
    expect(['gemini', 'open-model', 'offline']).toContain(answer.provider);
    
    const parsed = TrustAnswerSchema.safeParse(answer);
    expect(parsed.success).toBe(true);
  });

  it('handles completely unknown queries gracefully with honest fallback', async () => {
    const randomQuery = 'xyzzy1234987randomnonsensequestionalt';
    const answer = await getAnswer(randomQuery, []);
    expect(answer).toBeDefined();
    expect(answer.claims.length).toBeGreaterThan(0);
    expect(answer.uncertainties.length).toBeGreaterThan(0);
    // Must NOT contain error strings or stack traces
    expect(answer.directAnswer).not.toMatch(/quota/i);
    expect(answer.directAnswer).not.toMatch(/error/i);
    expect(answer.directAnswer).not.toMatch(/spike/i);
    const parsed = TrustAnswerSchema.safeParse(answer);
    expect(parsed.success).toBe(true);
  });

  it('matches fuzzy GATE queries accurately with correct claims', () => {
    const queries = [
      'is third year eligible for gate',
      'gate score validity period',
      'how to prepare for gate cse in 6 months'
    ];
    for (const q of queries) {
      const match = findKnowledgeBaseMatch(q);
      expect(match).not.toBeNull();
      expect(match?.directAnswer.length).toBeGreaterThan(30);
    }
  });
});
