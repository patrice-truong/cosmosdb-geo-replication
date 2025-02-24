public interface ICartService
{
    Task<Cart> GetCartAsync(string userName);
    Task<Cart> CreateOrUpdateCartAsync(Cart cart);
    Task DeleteCartAsync(string userName);    
}