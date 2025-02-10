using Microsoft.Azure.Cosmos;
using Azure.Identity;
using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace webapi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProductsController : ControllerBase
    {
        private readonly ILogger<ProductsController> _logger;
        private readonly CosmosClient _cosmosClient;
        private readonly IProductsService _productsService;

        public ProductsController(ILogger<ProductsController> logger, IConfiguration configuration, IProductsService productsService)
        {
            _logger = logger;
            _cosmosClient = CosmosDbHelper.InitializeCosmosClient(configuration);
        _productsService = productsService;

        }

        [HttpGet]
        public async Task<IActionResult> GetProducts()
        {
            var stopwatch = Stopwatch.StartNew();

            var products = await _productsService.GetProductsAsync();

            stopwatch.Stop();
            var duration = stopwatch.ElapsedMilliseconds;

            return Ok(new { duration, data = products  });
        }
    }
}
