public interface IProductsService
{
    Task<IEnumerable<Product>> GetProductsAsync();
    Task<Product> GetProductAsync(string id);
}