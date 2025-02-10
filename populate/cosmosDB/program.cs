using Microsoft.Azure.Cosmos;
using Azure.Identity;
using Microsoft.Azure.Cosmos.Fluent;
using System.Diagnostics;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using System.IO;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;

// Build configuration
var configuration = new ConfigurationBuilder()
    .SetBasePath(Directory.GetCurrentDirectory())
    .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
    .Build();

// Read Cosmos DB settings from configuration
var cosmosDbSettings = configuration.GetSection("CosmosDb");
string endpoint = cosmosDbSettings["Endpoint"] ?? throw new ArgumentNullException("Endpoint cannot be null");
string tenantId = cosmosDbSettings["TenantId"] ?? throw new ArgumentNullException("TenantId cannot be null");
string databaseName = cosmosDbSettings["DatabaseName"] ?? throw new ArgumentNullException("DatabaseName cannot be null");
string containerName = cosmosDbSettings["ContainerName"] ?? throw new ArgumentNullException("ContainerName cannot be null");
string region = cosmosDbSettings["ReplicaRegion"] ?? "Australia East";

var credentialOptions = new DefaultAzureCredentialOptions
{
    TenantId = tenantId,
    Diagnostics = { IsLoggingEnabled = true }
};

var credential = new DefaultAzureCredential(credentialOptions);
CosmosClientBuilder builder = new(endpoint, credential);

// Create Cosmos DB client with replica region in Australia East
using CosmosClient client = builder.WithApplicationRegion(region).Build();

// Create database if it does not exist
Console.WriteLine($"Creating database {databaseName} if it does not exist");
Database database = await client.CreateDatabaseIfNotExistsAsync(databaseName);
Console.WriteLine($"Database {databaseName} created");

// Create container if it does not exist
Console.WriteLine($"Creating container {containerName} if it does not exist");
Container container = await database.CreateContainerIfNotExistsAsync(containerName, "/id");
Console.WriteLine($"Container {containerName} created");

// Read JSON file and deserialize to list of products
Console.WriteLine("Reading JSON file and deserializing to list of products");
string jsonFilePath = "catalog.json";
string jsonString = File.ReadAllText(jsonFilePath);
List<Product> products = JsonSerializer.Deserialize<List<Product>>(jsonString) ?? new List<Product>();

Stopwatch stopwatch = new();

stopwatch.Restart();
Console.WriteLine("Populating Cosmos DB with products");
foreach (var product in products)
{
    string imagePath = Path.Combine("img", $"{product.id}.webp");
    string base64Image = ConvertImageToBase64(imagePath);

    var p = new
    {
        id = Convert.ToString(product.id),
        type = product.type,
        brand = product.brand,
        name = product.name,
        description = product.description,
        price = product.price,
        image = base64Image
    };

    var response = await container.CreateItemAsync<dynamic>(p);

    Console.WriteLine(product.name);
}
stopwatch.Stop();
Console.WriteLine($"Time taken:\t{stopwatch.ElapsedMilliseconds} ms");

string ConvertImageToBase64(string imagePath)
{
    if (File.Exists(imagePath))
    {
        using (Image<Rgba32> image = Image.Load<Rgba32>(imagePath))
        {
            using (MemoryStream ms = new MemoryStream())
            {
                image.SaveAsJpeg(ms);
                byte[] imageBytes = ms.ToArray();
                return "data:image/jpeg;base64," + Convert.ToBase64String(imageBytes);
            }
        }
    }
    return string.Empty;
}