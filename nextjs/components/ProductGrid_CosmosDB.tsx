// components/ProductGrid_CosmosDB.tsx

'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Product } from '@/models/product';
import { api_url } from '@/models/constants';
import { useCart } from '@/context/CartContext';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid'; // Import the uuid library

const prefix = "components/ProductGrid_CosmosDB.tsx";

export default function ProductGrid_CosmosDB() {
  const { addItem } = useCart();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageUrls, setImageUrls] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    async function fetchProducts() {
      try {
        const token = uuidv4(); // Generate a GUID as a string
        const response = await fetch(`${api_url}/api/products?token=${token}`);        
        const result = await response.json();
        console.log(`[${prefix}] fetchProducts: ${result.duration} ms `);
        setProducts(result.data);        
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  const handleAddToCart = (product: Product) => {
    const cartItem = {
      ...product,
      id: Number(product.id), // Convert id to number
    };
    addItem(cartItem);
    router.push('/cart');
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-3 xl:gap-x-8">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-w-1 aspect-h-1 w-full bg-gray-200 rounded-lg mb-4" />
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-1/4" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-3 xl:gap-x-8">
      {products.map((product) => (
        <div key={product.id} className="group relative">
          <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-lg bg-gray-200">
            <Image
              src={product.image}
              alt={product.name}
              className="h-full w-full object-cover object-center group-hover:opacity-75"
              width={300}
              height={300}
              unoptimized
            />
          </div>
          <div className="mt-4 flex justify-between">
            <div>
              <h3 className="text-sm text-gray-700">{product.name}</h3>
              <p className="mt-1 text-sm text-gray-500">${product.price}</p>
            </div>
          </div>
          <Button
            onClick={() => handleAddToCart(product)}
            className="mt-4 w-full"
          >
            Add to Cart
          </Button>
        </div>
      ))}
    </div>
  );
}

