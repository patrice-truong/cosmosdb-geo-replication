using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Configuration;
using System.Collections.Generic;
using System.Threading.Tasks;
using Newtonsoft.Json;

using System.Threading.Tasks;

public interface ICartService
{
    Task<Cart> GetCartAsync(string userName);
    Task StoreCartAsync(Cart cart);
}

public class CartService : ICartService
{
    private readonly CosmosClient _cosmosClient;
    private readonly string _databaseName;
    private readonly string _cartsContainerName;

    public CartService(CosmosClient cosmosClient, IConfiguration configuration)
    {
        _cosmosClient = cosmosClient;
        _databaseName = configuration["CosmosDb:DatabaseName"];
        _cartsContainerName = configuration["CosmosDb:CartsContainerName"];
    }

    public async Task<Cart> GetCartAsync(string userName)
    {
        var container = _cosmosClient.GetContainer(_databaseName, _cartsContainerName);
        var query = new QueryDefinition("SELECT * FROM c WHERE c.userName = @userName")
            .WithParameter("@userName", userName);
        var iterator = container.GetItemQueryIterator<Cart>(query);
        var carts = new List<Cart>();

        while (iterator.HasMoreResults)
        {
            var response = await iterator.ReadNextAsync();
            carts.AddRange(response);
        }

        return carts.FirstOrDefault();
    }

    public async Task StoreCartAsync(Cart cart)
    {
        var container = _cosmosClient.GetContainer(_databaseName, _cartsContainerName);
        if(string.IsNullOrEmpty(cart.id))
        {
            cart.id = Constants.UserName;;
        }
        Console.WriteLine(JsonConvert.SerializeObject(cart));
        await container.UpsertItemAsync(cart, new PartitionKey(cart.userName));
    }
}