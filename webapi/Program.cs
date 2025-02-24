using Microsoft.Azure.Cosmos;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

// Add before builder.Services.AddControllers();
builder.Services.AddHttpClient();
builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add CORS services
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowSpecificOrigins",
        builder =>
        {
            builder.WithOrigins("*") // Replace with your allowed origins
                   .AllowAnyHeader()
                   .AllowAnyMethod();
        });
});
// Register CosmosClient
builder.Services.AddSingleton<CosmosClient>(serviceProvider =>
{
    var configuration = serviceProvider.GetRequiredService<IConfiguration>();
    return CosmosDbHelper.InitializeCosmosClient(configuration);
});

builder.Services.AddScoped<ICartService, CartService>();
builder.Services.AddScoped<IProductsService, ProductsService>();
builder.Services.AddHostedService<CartChangeFeedProcessor>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseAuthorization();

// Apply the CORS policy
app.UseCors("AllowSpecificOrigins");

app.MapControllers();

app.Run();