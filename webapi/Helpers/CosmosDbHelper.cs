using Azure.Identity;
using Microsoft.Azure.Cosmos;

public static class CosmosDbHelper
{
    public static CosmosClient InitializeCosmosClient(IConfiguration configuration)
    {
        // Read Cosmos DB settings from configuration
        var cosmosDbSettings = configuration.GetSection("CosmosDb");
        string endpoint =
            cosmosDbSettings["Endpoint"]
            ?? throw new ArgumentNullException("Endpoint cannot be null");
        string tenantId =
            cosmosDbSettings["TenantId"]
            ?? throw new ArgumentNullException("TenantId cannot be null");

        CosmosClientOptions options = new CosmosClientOptions()
        {
            ApplicationPreferredRegions = new List<string>()
            {
                Regions.EastUS2,
                Regions.AustraliaEast,
            },
            // ApplicationPreferredRegions = new List<string>() {
            //     Regions.AustraliaEast,
            //     Regions.EastUS2
            // },
            ConnectionMode = ConnectionMode.Direct,
        };

        var credentialOptions = new DefaultAzureCredentialOptions
        {
            TenantId = tenantId,
            Diagnostics = { IsLoggingEnabled = true },
        };
        var credential = new DefaultAzureCredential(credentialOptions);

        return new CosmosClient(endpoint, credential, options);
    }
}
