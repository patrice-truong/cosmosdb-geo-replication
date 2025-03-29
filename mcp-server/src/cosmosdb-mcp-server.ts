import { Container, JSONValue, SqlQuerySpec } from '@azure/cosmos'
import { initializeCosmosDB, validateEnvironmentVariables } from './cosmosdb'

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { getEmbeddingsAsync } from './aoai'
import { z } from 'zod'

export class CosmosDBMcpServer {
  private server: McpServer
  private sourceFile = 'src/cosmosdb-mcp-server.ts'

  constructor () {
    this.server = new McpServer(
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

    this.initializeTools()
  }

  // private async getProducts (container: Container) {
  //   const startTime = Date.now()
  //   try {
  //     const query = `SELECT c.id, c.type, c.brand, c.name, c.description, c.price FROM c`
  //     const sqlQuerySpec: SqlQuerySpec = {
  //       query: query
  //     }
  //     const { resources: items } = await container.items
  //       .query(sqlQuerySpec)
  //       .fetchAll()

  //     const duration = Date.now() - startTime
  //     console.debug(`[${this.sourceFile}::getProducts] ${duration} ms`)

  //     return {
  //       data: items,
  //       statusCode: 200,
  //       duration: duration
  //     }
  //   } catch (error) {
  //     console.timeEnd('getProducts')
  //     return {
  //       error: 'Error fetching products from Cosmos DB: ' + error,
  //       statusCode: 500
  //     }
  //   }
  // }

  private async searchProducts (container: Container, q: string) {
    const startTime = Date.now()
    try {
      const embeddings = await getEmbeddingsAsync(q)
      if (!embeddings) {
        throw new Error('Failed to generate embeddings')
      }
      console.debug(`[${this.sourceFile}::searchProducts] embeddings: ${embeddings}`)

      const sqlQuerySpec: SqlQuerySpec = {
        query: `
      SELECT TOP 10 
        c.id, c.type, c.brand, c.name, c.description, c.price,
        VectorDistance(c.embedding, @queryEmbedding) as similarity
        FROM c
        ORDER BY VectorDistance(c.embedding, @queryEmbedding) 
      `,
        parameters: [{ name: '@queryEmbedding', value: embeddings }]
      }
      const { resources: items } = await container.items
        .query(sqlQuerySpec)
        .fetchAll()

      const duration = Date.now() - startTime
      console.debug(`[${this.sourceFile}::searchProducts] ${duration} ms`)

      return {
        data: items,
        statusCode: 200,
        duration: duration
      }
    } catch (error) {
      console.timeEnd('searchProducts')
      return {
        error: 'Error fetching products from Cosmos DB: ' + error,
        statusCode: 500
      }
    }
  }

  private initializeTools () {
    this.server.tool(
      'echo',
      'Echo text back to the user',
      {
        message: z.string()
      },
      async ({ message }) => ({
        content: [{ type: 'text', text: `Tool echo: ${message}` }]
      })
    )

    this.server.tool(
      'searchProducts',
      'Given a user query, search for matching products in the Azure Cosmos DB database',
      {
        query: z.string()
      },
      async (args, extra) => {
        try {
          validateEnvironmentVariables()
          const { client, database, container } = await initializeCosmosDB()
          const { data, statusCode, duration } = await this.searchProducts(
            container,
            args.query
          )
          console.debug(`[${this.sourceFile}::searchProducts] ${duration} ms`)
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
                text: JSON.stringify({
                  error: 'Error searching for products in Cosmos DB:' + error
                })
              }
            ],
            isError: true
          }
        }
      }
    )
  }

  getServer () {
    return this.server
  }
}
