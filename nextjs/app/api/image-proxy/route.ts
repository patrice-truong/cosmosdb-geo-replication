// api/image-proxy/route.ts

// Images are stored in an Azure Blob Storage container https://stcanadaeast6p98v.blob.core.windows.net/img
// This API fetches images from the container (using EntraID authentication) and serves them to the client
// The image ID is passed as a query parameter
// The image is fetched from the container and returned as a response

// export const dynamic = 'force-dynamic' // Ensure dynamic rendering

import {
  BlobServiceClient,
  StorageSharedKeyCredential
} from '@azure/storage-blob'

import { DefaultAzureCredential } from '@azure/identity'
import { NextResponse } from 'next/server'
import { Readable } from 'stream'

/**
 * Converts a ReadableStream to a Buffer
 */
async function streamToBuffer (stream: Readable): Promise<Buffer> {
  const chunks: Uint8Array[] = []
  for await (const chunk of stream) {
    // Convert chunk to Uint8Array explicitly
    const bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    chunks.push(new Uint8Array(bufferChunk))
  }
  return Buffer.concat(chunks)
}

export async function GET (request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME!
  // const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY
  const imagePath = `${id}.webp`

  if (!accountName) {
    return NextResponse.json(
      { error: 'Azure Storage account name must be provided.' },
      { status: 500 }
    )
  }

  try {
    const credential = new DefaultAzureCredential()
    const blobServiceClient = new BlobServiceClient(
      `https://${accountName}.blob.core.windows.net`,
      credential
    )

    const containerClient = blobServiceClient.getContainerClient(containerName)
    const blobClient = containerClient.getBlobClient(imagePath)

    // Fetch the image as a stream
    const downloadResponse = await blobClient.download()
    const contentType = downloadResponse.contentType || 'image/webp'

    const readableStream = downloadResponse.readableStreamBody
    if (!readableStream) {
      return NextResponse.json(
        { error: 'Failed to fetch image' },
        { status: 500 }
      )
    }

    // Convert stream to a buffer
    const buffer = await streamToBuffer(Readable.from(readableStream))

    // Convert buffer to base64
    const base64Image = buffer.toString('base64')

    return NextResponse.json(
      { src: `data:${contentType};base64,${base64Image}` },
      { status: 200 }
    )
  } catch (error) {
    console.error('Azure Blob Fetch Error:', error)
    return NextResponse.json(
      { error: error },
      { status: 500 }
    )
  }
}
