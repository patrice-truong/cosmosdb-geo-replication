using System.Diagnostics;
using Microsoft.Azure.Cosmos;

public class ProductsService : IProductsService
{
    private readonly CosmosClient _cosmosClient;
    private readonly string _databaseName;
    private readonly string _containerName;

    public ProductsService(CosmosClient cosmosClient, IConfiguration configuration)
    {
        _cosmosClient = cosmosClient;
        _databaseName = configuration["CosmosDb:DatabaseName"];
        _containerName = configuration["CosmosDb:ProductsContainerName"];
    }

    public async Task<IEnumerable<Product>> GetProductsAsync()
    {
        var container = _cosmosClient.GetContainer(_databaseName, _containerName);
        var query = container.GetItemQueryIterator<Product>(new QueryDefinition("SELECT * FROM c"));
        var results = new List<Product>();
        
        while (query.HasMoreResults)
        {
            var response = await query.ReadNextAsync();
            results.AddRange(response);
        }
        
        return results;
    }

    public async Task<Product> GetProductAsync(string id)
    {
        var container = _cosmosClient.GetContainer(_databaseName, _containerName);
        try
        {
            var response = await container.ReadItemAsync<Product>(id, new PartitionKey(id));
            return response.Resource;
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return null;
        }
    }
}
