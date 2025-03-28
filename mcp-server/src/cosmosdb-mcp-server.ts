import { Container, SqlQuerySpec } from '@azure/cosmos'
import { initializeCosmosDB, validateEnvironmentVariables } from './cosmosdb'

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
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

  private async getProducts (container: Container) {
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
      console.debug(`[${this.sourceFile}::getProducts] ${duration} ms`)

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
      'getProducts',
      'Get products from the Azure Cosmos DB database',
      {},
      async (args, extra) => {
        try {
          validateEnvironmentVariables()
          const { client, database, container } = await initializeCosmosDB()
          const { data, statusCode, duration } = await this.getProducts(
            container
          )
          console.debug(`[${this.sourceFile}::getProducts] ${duration} ms`)
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
                  error: 'Error fetching products from Cosmos DB:' + error
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
