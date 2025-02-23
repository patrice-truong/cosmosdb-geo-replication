import { BlobServiceClient } from '@azure/storage-blob'
import { ClientSecretCredential } from '@azure/identity'
import { NextResponse } from 'next/server'

export async function GET (request: Request) {
  const { searchParams } = new URL(request.url)
  const blobName = searchParams.get('blob')

  if (!blobName) {
    return NextResponse.json(
      { error: 'Blob name is required' },
      { status: 400 }
    )
  }

  try {
    const credential = new ClientSecretCredential(
      process.env.AZURE_TENANT_ID!,
      process.env.AZURE_CLIENT_ID!,
      process.env.AZURE_CLIENT_SECRET!
    )

    const blobServiceClient = new BlobServiceClient(
      `https://${process.env.AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net`,
      credential
    )

    const containerClient = blobServiceClient.getContainerClient(
      process.env.AZURE_STORAGE_CONTAINER_NAME!
    )
    const blobClient = containerClient.getBlobClient(blobName)

    // Download blob content
    const downloadResponse = await blobClient.download()
    const chunks = []

    // @ts-ignore
    for await (const chunk of downloadResponse.readableStreamBody) {
      chunks.push(chunk)
    }

    const buffer = Buffer.concat(chunks)
    const base64String = `data:image/webp;base64,${buffer.toString('base64')}`

    return NextResponse.json({ url: base64String })
  } catch (error) {
    console.error('Error accessing blob:', JSON.stringify(error, null, 2))
    return NextResponse.json(
      {
        error: 'Failed to access blob',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
