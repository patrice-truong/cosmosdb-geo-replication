import { AzureOpenAI } from 'openai'
import { NextResponse } from 'next/server'

function validateEnvironmentVariables () {
  const required = ['AZURE_OPENAI_ENDPOINT', 'AZURE_OPENAI_API_KEY']

  for (const variable of required) {
    if (!process.env[variable]) {
      throw new Error(`Missing required environment variable: ${variable}`)
    }
  }
}

export async function POST (req: Request) {
  try {
    validateEnvironmentVariables()
    const { message, conversationHistory, tools } = await req.json()

    const messages = [
      {
        role: 'system',
        content:
          'You are a helpful shopping assistant that helps customers find products and answers questions about them.'
      },
      ...conversationHistory.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: message }
    ]

    const client = new AzureOpenAI({
      endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      apiKey: process.env.AZURE_OPENAI_API_KEY!,
      apiVersion: "2025-02-01-preview"
    })

    const response = await client.chat.completions.create({
      messages: messages,
      model: 'gpt-4o-mini',
      tools: tools
    })

    // const content =
    //   response.choices[0]?.message?.content ||
    //   "I couldn't process your request."
    const content = JSON.stringify(response)

    return NextResponse.json({ content })
  } catch (error) {
    console.error('Chat API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
