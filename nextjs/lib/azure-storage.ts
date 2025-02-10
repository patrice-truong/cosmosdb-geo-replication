import { BlobSASPermissions, BlobServiceClient, StorageSharedKeyCredential } from "@azure/storage-blob";

export async function generateUrl(id: string): Promise<string> {
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
    const containerName = "data";
  
    if (!accountName || !accountKey) {
      throw new Error("Azure Storage account name and key must be provided.");
    }
  
    const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
    const baseUrl = `https://${accountName}.blob.core.windows.net`;
    const blobServiceClient = new BlobServiceClient(
      baseUrl,
      sharedKeyCredential
    );
  
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobPath = `img/${id}.webp`;
    const blobClient = containerClient.getBlobClient(blobPath);
  
    const expiresOn = new Date();
    expiresOn.setMinutes(expiresOn.getMinutes() + 60);
  
    const sasUrl = await blobClient.generateSasUrl({
      expiresOn,
      permissions: BlobSASPermissions.parse("r")
    });

    return sasUrl;
}