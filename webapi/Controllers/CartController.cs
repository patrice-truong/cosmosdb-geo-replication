// Controllers/CartController.cs

using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Cosmos;
using Newtonsoft.Json;

[ApiController]
[Route("api/[controller]")]
public class CartController : ControllerBase
{
    private readonly ILogger<CartController> _logger;
    private readonly CosmosClient _cosmosClient;
    private readonly ICartService _cartService;

    public CartController(
        ILogger<CartController> logger,
        IConfiguration configuration,
        ICartService cartService
    )
    {
        _logger = logger;
        _cosmosClient = CosmosDbHelper.InitializeCosmosClient(configuration);
        _cartService = cartService;
    }

    [HttpGet()]
    public async Task<IActionResult> GetCart([FromQuery] string userName)
    {
        var stopwatch = Stopwatch.StartNew();

        var cart = await _cartService.GetCartAsync(userName);

        stopwatch.Stop();
        var duration = stopwatch.ElapsedMilliseconds;

        return Ok(new { duration, data = cart });
    }

    [HttpPost()]
    public async Task<IActionResult> StoreCart([FromBody] Cart cart)
    {
        // _logger.LogInformation(
        //     $"Received cart update. Headers: {string.Join(", ", Request.Headers.Select(h => $"{h.Key}={h.Value.ToString()}"))}"
        // );

        _logger.LogInformation($"[CartController::StoreCart]: {JsonConvert.SerializeObject(cart)}");

        var stopwatch = Stopwatch.StartNew();

        if (cart.items == null || cart.items.Count == 0)
        {
            // Handle empty cart as a deletion
            await _cartService.DeleteCartAsync(cart.userName);
        }
        else
        {
            await _cartService.CreateOrUpdateCartAsync(cart);
        }

        stopwatch.Stop();
        var duration = stopwatch.ElapsedMilliseconds;

        return Ok(new { duration });
    }

    [HttpDelete()]
    public async Task<IActionResult> DeleteCart([FromQuery] string userName)
    {
        _logger.LogInformation($"Deleting cart for user: {userName}");

        var stopwatch = Stopwatch.StartNew();

        // Delete from Cosmos DB
        await _cartService.DeleteCartAsync(userName);

        // Notify about empty cart
        using (var httpClient = new HttpClient())
        {
            var payload = new
            {
                isChangeFeed = false,
                userName = userName,
                items = new List<CartItem>(),
                isEmpty = true,
                operationType = "Delete",
            };
            await httpClient.PostAsJsonAsync("http://localhost:3000/api/cartEmpty", payload);
        }

        stopwatch.Stop();
        var duration = stopwatch.ElapsedMilliseconds;

        return Ok(new { duration });
    }
}
