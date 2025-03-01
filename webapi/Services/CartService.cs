// Services/CartService.cs

using Microsoft.Azure.Cosmos;
using Newtonsoft.Json;

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
        try
        {
            var response = await container.ReadItemAsync<Cart>(
                userName,
                new PartitionKey(userName)
            );
            return response.Resource;
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    public async Task<Cart> CreateOrUpdateCartAsync(Cart cart)
    {
        var container = _cosmosClient.GetContainer(_databaseName, _cartsContainerName);
        if (string.IsNullOrEmpty(cart.id))
        {
            cart.id = Constants.UserName;
        }
        cart.userName = cart.id;
        var response = await container.UpsertItemAsync(cart, new PartitionKey(cart.userName));
        return response.Resource;
    }

    public async Task DeleteCartAsync(string userName)
    {
        var container = _cosmosClient.GetContainer(_databaseName, _cartsContainerName);
        await container.DeleteItemAsync<Cart>(userName, new PartitionKey(userName));
    }
}
