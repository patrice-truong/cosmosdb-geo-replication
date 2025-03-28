import { ConnectionPolicy, CosmosClient } from '@azure/cosmos'

import { DefaultAzureCredential } from '@azure/identity'

const sourceFile = 'src/cosmosdb.ts'

export function validateEnvironmentVariables () {
  const required = [
    'AZURE_COSMOSDB_NOSQL_ENDPOINT',
    'AZURE_COSMOSDB_NOSQL_DATABASE',
    'AZURE_COSMOSDB_NOSQL_PRODUCTS_CONTAINER',
    'AZURE_COSMOSDB_NOSQL_CARTS_CONTAINER'
  ]

  for (const variable of required) {
    if (!process.env[variable]) {
      throw new Error(`Missing required environment variable: ${variable}`)
    }
  }
}

export const initializeCosmosDB = async () => {
  const endpoint = process.env.AZURE_COSMOSDB_NOSQL_ENDPOINT as string
  const databaseId = process.env.AZURE_COSMOSDB_NOSQL_DATABASE as string
  const productsContainerId = process.env
    .AZURE_COSMOSDB_NOSQL_PRODUCTS_CONTAINER as string
  const cartsContainerId = process.env
    .AZURE_COSMOSDB_NOSQL_CARTS_CONTAINER as string
  const preferredLocations = process.env.PREFERRED_LOCATIONS?.split(',') || [
    'East US 2',
    'West US 2',
    'North Europe'
  ]

  const connectionPolicy: ConnectionPolicy = {
    useMultipleWriteLocations: true,
    preferredLocations: preferredLocations
  }

  const credential = new DefaultAzureCredential()

  console.debug(
    `[${sourceFile}::initializeCosmosDB] Cosmos DB endpoint: ${endpoint}`
  )
  console.debug(
    `[${sourceFile}::initializeCosmosDB] Cosmos DB container: ${productsContainerId}`
  )

  const client = new CosmosClient({
    endpoint: endpoint,
    aadCredentials: credential,
    connectionPolicy: connectionPolicy
  })

  const database = client.database(databaseId)
  const container = database.container(productsContainerId)

  return { client, database, container }
}
