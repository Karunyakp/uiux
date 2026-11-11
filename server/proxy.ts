import express from 'express'

const app = express()
app.use(express.json())

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''
const PORT = process.env.PORT || 4001

app.post('/api/answer', async (req, res) => {
  const { question, history = [] } = req.body
  if (!question) {
    return res.status(400).json({ error: 'Question is required' })
  }

  if (!GEMINI_API_KEY) {
    return res.status(503).json({ error: 'GEMINI_API_KEY is not configured on server' })
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`
    const contents = [
      ...history.slice(-4).map((h: any) => ({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }]
      })),
      { role: 'user', parts: [{ text: question }] }
    ]

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json'
        }
      })
    })

    if (!response.ok) {
      return res.status(response.status).json({ error: `Gemini API returned ${response.status}` })
    }

    const data = await response.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
    const parsed = JSON.parse(text)
    return res.json(parsed)
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Server proxy failure' })
  }
})

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`TrustLens Secure Key Proxy listening on port ${PORT}`)
  })
}

export default app
