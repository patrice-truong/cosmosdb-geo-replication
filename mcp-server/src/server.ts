// src/server.ts:

import 'dotenv/config'

import { Container, SqlQuerySpec } from '@azure/cosmos'
import {
  McpServer,
  ResourceTemplate
} from '@modelcontextprotocol/sdk/server/mcp.js'
import express, { Request, Response } from 'express'
import { initializeCosmosDB, validateEnvironmentVariables } from './cosmosdb'

import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import cors from 'cors'
import { z } from 'zod'

const sourceFile = 'src/main.ts'

const host = process.env.HOST || '127.0.0.1'
const port = parseInt(process.env.PORT || '3001')

const app = express()

// Add CORS middleware
app.use(cors({
  origin: 'http://localhost:3002', // Next.js app URL
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}))

const server = new McpServer(
  {
    name: 'cosmosdb-mcp-server',
    version: '0.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
)

const getProducts = async (container: Container) => {
  const startTime = Date.now()
  try {
    const query = `SELECT c.id, c.type, c.brand, c.name, c.description, c.price FROM c`
    const sqlQuerySpec: SqlQuerySpec = {
      query: query
    }
    const { resources: items } = await container.items
      .query(sqlQuerySpec)
      .fetchAll()

    const duration = Date.now() - startTime
    console.debug(`[${sourceFile}::getProducts] ${duration} ms`)

    return {
      data: items,
      statusCode: 200,
      duration: duration
    }
  } catch (error) {
    console.timeEnd('getProducts')
    return {
      error: 'Error fetching products from Cosmos DB: ' + error,
      statusCode: 500
    }
  }
}

server.tool('echo', { message: z.string() }, async ({ message }) => ({
  content: [{ type: 'text', text: `Tool echo: ${message}` }]
}))

server.tool('getProducts', {}, async (args, extra) => {
  try {
    validateEnvironmentVariables()
    const { client, database, container } = await initializeCosmosDB()
    const { data, statusCode, duration } = await getProducts(container)
    console.debug(`[${sourceFile}::getProducts] ${duration} ms`)
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(data)
        }
      ]
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: 'Error fetching products from Cosmos DB:' + error })
        }
      ],
      isError: true
    }
  }
})

const transports: { [sessionId: string]: SSEServerTransport } = {}

app.get('/sse', async (_: Request, res: Response) => {
  const transport = new SSEServerTransport('/messages', res)
  transports[transport.sessionId] = transport
  res.on('close', () => {
    delete transports[transport.sessionId]
  })
  await server.connect(transport)
})

app.post('/messages', async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string
  const transport = transports[sessionId]
  if (transport) {
    await transport.handlePostMessage(req, res)
  } else {
    res.status(400).send('No transport found for sessionId')
  }
})

// app.listen(3001,  host, async () => {
//   try {
//     console.debug(`[${sourceFile}] Initializing Azure CosmosDB...`)
//     validateEnvironmentVariables()
//     const { client, database, container } = await initializeCosmosDB()
//     console.debug(`[${sourceFile}] Azure Cosmos DB initialized successfully`)

//     console.debug(`[${sourceFile}] Listening on: http://${host}:${port}`)

//   } catch (error) {
//     console.error(`[${sourceFile}] Failed to initialize CosmosDB:`, error)
//   }
// });

app.listen(3001)
