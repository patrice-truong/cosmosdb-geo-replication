// filepath: /c:/Data/00_dev/patrice.truong@gmail.com/cosmosdb-geo-replication/webapi/Controllers/ImageProxyController.cs
using System;
using System.IO;
using System.Threading.Tasks;
using Azure.Identity;
using Azure.Storage.Blobs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;

namespace webapi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ImageProxyController : ControllerBase
    {
        private readonly ILogger<ImageProxyController> _logger;
        private readonly BlobServiceClient _blobServiceClient;
        private readonly string _containerName = "img";

        public ImageProxyController(
            ILogger<ImageProxyController> logger,
            IConfiguration configuration
        )
        {
            _logger = logger;
            var blobServiceUri = new Uri(
                $"https://{configuration["AzureBlobStorage:AccountName"]}.blob.core.windows.net"
            );
            _blobServiceClient = new BlobServiceClient(
                blobServiceUri,
                new DefaultAzureCredential()
            );
        }

        [HttpGet]
        public async Task<IActionResult> GetImage([FromQuery] string id)
        {
            if (string.IsNullOrEmpty(id))
            {
                return BadRequest(new { error = "id is required" });
            }

            try
            {
                Console.WriteLine("Getting container client:" + _containerName);
                var containerClient = _blobServiceClient.GetBlobContainerClient(_containerName);
                Console.WriteLine("Getting image:" + id + ".webp");
                var blobClient = containerClient.GetBlobClient(id + ".webp");

                if (await blobClient.ExistsAsync())
                {
                    await using var memoryStream = new MemoryStream();
                    await blobClient.DownloadToAsync(memoryStream);
                    var base64Image = Convert.ToBase64String(memoryStream.ToArray());
                    var contentType =
                        blobClient.GetProperties().Value.ContentType ?? "application/octet-stream";

                    return Ok(new { src = $"data:{contentType};base64,{base64Image}" });
                }
                else
                {
                    return NotFound(new { error = "Image not found" });
                }
            }
            catch (Exception ex)
            {
                var error = JsonConvert.SerializeObject(ex);
                _logger.LogError(ex, error);
                return StatusCode(500, new { error = "Error fetching image" });
            }
        }
    }
}
