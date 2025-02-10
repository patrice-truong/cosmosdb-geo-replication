// lib/cosmosdb.ts

import { ConnectionPolicy, CosmosClient, CosmosClientOptions } from '@azure/cosmos'

import { Cart } from '@/models/cart'
import { DefaultAzureCredential } from '@azure/identity'
import { SqlQuerySpec } from '@azure/cosmos'

const sourceFile = 'lib/cosmosdb.ts'

const endpoint = process.env.AZURE_COSMOSDB_NOSQL_ENDPOINT as string
const databaseId = process.env.AZURE_COSMOSDB_NOSQL_DATABASE as string
const productsContainerId = process.env.AZURE_COSMOSDB_NOSQL_PRODUCTS_CONTAINER as string
const cartsContainerId = process.env.AZURE_COSMOSDB_NOSQL_CARTS_CONTAINER as string

// Read region selection preferences from .env
// 1 - East US 2
// 2 - West US 2
// 3 - North Europe
// const preferredLocations = ['East US 2', 'West US 2', 'North Europe'];
const preferredLocations = process.env.PREFERRED_LOCATIONS?.split(',') || ['East US 2', 'West US 2', 'North Europe'];


const connectionPolicy: ConnectionPolicy = {
  useMultipleWriteLocations: true,
  preferredLocations: preferredLocations
}

const credential = new DefaultAzureCredential()

const client = new CosmosClient({
  endpoint: endpoint,
  aadCredentials: credential,
  connectionPolicy: connectionPolicy
})

const database = client.database(databaseId)
export const cartsContainer = database.container(cartsContainerId)
export const productsContainer = database.container(productsContainerId)

export const storeCart = async (cart: Cart) => {
  try {
    // find cart with email
    const sqlQuerySpec: SqlQuerySpec = {
      query: 'SELECT TOP 1 * FROM c WHERE c.userName = @userName',
      parameters: [
        {
          name: '@userName',
          value: cart.userName
        }
      ]
    }
    const { resources: items } = await cartsContainer.items
      .query(sqlQuerySpec)
      .fetchAll()

    if(items.length > 0) {
      const existingCart = items[0]
      existingCart.items = cart.items
      cartsContainer.items.upsert(existingCart)
    } else {
      cartsContainer.items.upsert(cart)
    }

    return {
      data: items,
      statusCode: 200
    }
  } catch (error) {
    return {
      error: 'Error storing cart in Cosmos DB: ' + error,
      statusCode: 500
    }
  }
}


// Load cart from Cosmos DB for the selected userName
export const loadCart = async (userName: string) => {
  try {
    const sqlQuerySpec: SqlQuerySpec = {
      query: 'SELECT TOP 1 * FROM c WHERE c.userName = @userName',
      parameters: [
        {
          name: '@userName',
          value: userName
        }
      ]
    }
    const { resources: items } = await cartsContainer.items
      .query(sqlQuerySpec)
      .fetchAll()

    return {
      data: items,
      statusCode: 200
    }
  } catch (error) {
    return {
      error: 'Error loading cart from Cosmos DB: ' + error,
      statusCode: 500
    }
  }
}

export const getProducts = async () => {
  const startTime = Date.now();
  try {
    const query = `SELECT c.id, c.type, c.brand, c.name, c.description, c.price FROM c`
    const sqlQuerySpec: SqlQuerySpec = {
      query: query
    }
    const { resources: items } = await productsContainer.items
      .query(sqlQuerySpec)
      .fetchAll()
    
    const duration = Date.now() - startTime;
    console.debug(`[${sourceFile}] getProducts: ${duration} ms`);

    return {
      data: items,      
      statusCode: 200,
      duration: duration
    }
  } catch (error) {
    console.timeEnd('getProducts');
    return {
      error: 'Error fetching products from Cosmos DB: ' + error,
      statusCode: 500
    }
  }
}
