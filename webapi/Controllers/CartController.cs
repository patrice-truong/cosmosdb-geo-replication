using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Diagnostics;
using System.Threading.Tasks;

[ApiController]
[Route("api/[controller]")]
public class CartController : ControllerBase
{
    private readonly ILogger<CartController> _logger;
    private readonly CosmosClient _cosmosClient;
    private readonly ICartService _cartService;

    public CartController(ILogger<CartController> logger, IConfiguration configuration, ICartService cartService)
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
        var stopwatch = Stopwatch.StartNew();

        await _cartService.StoreCartAsync(cart);

        stopwatch.Stop();
        var duration = stopwatch.ElapsedMilliseconds;

        return Ok(new { duration });
    }
}