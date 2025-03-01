using System.Net.Http.Json;
using Microsoft.Azure.Cosmos;
using Newtonsoft.Json;

public class CartChangeFeedProcessor : IHostedService
{
    private readonly CosmosClient _cosmosClient;
    private readonly IConfiguration _configuration;
    private readonly HttpClient _httpClient;
    private Container _leaseContainer;
    private Container _cartContainer;
    private ChangeFeedProcessor _processor;

    public CartChangeFeedProcessor(
        CosmosClient cosmosClient,
        IConfiguration configuration,
        IHttpClientFactory httpClientFactory
    )
    {
        _cosmosClient = cosmosClient;
        _configuration = configuration;
        _httpClient = httpClientFactory.CreateClient();
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        var databaseId = _configuration["CosmosDb:DatabaseName"];
        _cartContainer = _cosmosClient.GetContainer(
            databaseId,
            _configuration["CosmosDb:CartsContainerName"]
        );

        // Create lease container if it doesn't exist
        var database = _cosmosClient.GetDatabase(databaseId);
        _leaseContainer = (
            await database.CreateContainerIfNotExistsAsync(
                "lease",
                "/id",
                400,
                cancellationToken: cancellationToken
            )
        ).Container;

        _processor = _cartContainer
            .GetChangeFeedProcessorBuilder<Cart>("cartProcessor", HandleChangesAsync)
            .WithInstanceName("cartProcessorInstance")
            .WithLeaseContainer(_leaseContainer)
            .WithPollInterval(TimeSpan.FromMilliseconds(200))
            .WithMaxItems(100)
            .Build();

        await _processor.StartAsync();
    }

    public async Task StopAsync(CancellationToken cancellationToken)
    {
        if (_processor != null)
        {
            await _processor.StopAsync();
        }
    }

    private async Task HandleChangesAsync(
        IReadOnlyCollection<Cart> changes,
        CancellationToken cancellationToken
    )
    {
        foreach (var cart in changes)
        {
            try
            {
                var payload = new
                {
                    isChangeFeed = true,
                    userName = cart.userName,
                    items = cart.items,
                };
                Console.WriteLine($"Change detected: {JsonConvert.SerializeObject(cart)}");
                await _httpClient.PostAsJsonAsync(
                    "http://localhost:3000/api/cartChange",
                    payload,
                    cancellationToken
                );
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to send cart change notification: {ex.Message}");
            }
        }
    }
}
