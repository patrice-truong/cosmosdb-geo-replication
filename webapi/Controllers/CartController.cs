using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Cosmos;

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
        _logger.LogInformation(
            $"Received cart update. Headers: {string.Join(", ", Request.Headers.Select(h => $"{h.Key}={h.Value.ToString()}"))}"
        );

        if (Request.Headers.ContainsKey("X-Change-Feed-Operation"))
        {
            _logger.LogInformation("Skipping change feed originated request");
            return Ok();
        }

        var stopwatch = Stopwatch.StartNew();
        await _cartService.CreateOrUpdateCartAsync(cart);

        stopwatch.Stop();
        var duration = stopwatch.ElapsedMilliseconds;

        return Ok(new { duration });
    }
}
