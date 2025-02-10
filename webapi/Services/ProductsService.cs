using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Configuration;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Diagnostics;

public interface IProductsService
{
    Task<List<Product>> GetProductsAsync();
}

public class ProductsService : IProductsService
{
    private readonly CosmosClient _cosmosClient;
    private readonly string _databaseName;
    private readonly string _productsContainerName;

    public ProductsService(CosmosClient cosmosClient, IConfiguration configuration)
    {
        _cosmosClient = cosmosClient;
        _databaseName = configuration["CosmosDb:DatabaseName"];
        _productsContainerName = configuration["CosmosDb:ProductsContainerName"];
    }

    public async Task<List<Product>> GetProductsAsync()
    {
        var container = _cosmosClient.GetContainer(_databaseName, _productsContainerName);
        var query = new QueryDefinition("SELECT * FROM c");

        Stopwatch stopwatch = new();
        stopwatch.Restart();
        
        var iterator = container.GetItemQueryIterator<Product>(query);
        var products = new List<Product>();

        while (iterator.HasMoreResults)
        {
            var response = await iterator.ReadNextAsync();
            products.AddRange(response);
        }

        stopwatch.Stop();
        Console.WriteLine($"Duration: {stopwatch.ElapsedMilliseconds} ms");
        return products;
    }
}