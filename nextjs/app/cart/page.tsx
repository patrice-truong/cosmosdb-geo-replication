'use client'

import { Minus, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { useCart } from '@/context/CartContext'

export default function CartPage () {
  const { items, removeItem, updateQuantity } = useCart()

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  if (items.length === 0) {
    return (
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12'>
        <h1 className='text-2xl font-bold mb-8'>Shopping Cart</h1>
        <p>Your cart is empty</p>
      </div>
    )
  }

  return (
    <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12'>
      <h1 className='text-2xl font-bold mb-8'>Shopping Cart</h1>
      <div className='grid grid-cols-1 lg:grid-cols-12 gap-8'>
        <div className='lg:col-span-8'>
          {items.map(item => (
            <div key={item.id} className='flex gap-4 py-4 border-b'>
              <Image
                src={item.image}
                alt={item.name}
                className='w-24 h-24 object-cover rounded'
                width={96}
                height={96}
                unoptimized
              />
              <div className='flex-1'>
                <h3 className='font-medium'>{item.name}</h3>
                <p className='text-gray-500'>${item.price}</p>
                <div className='flex items-center gap-2 mt-2'>
                  <Button
                    variant='outline'
                    size='icon'
                    onClick={() =>
                      updateQuantity(item.id, Math.max(0, item.quantity - 1))
                    }
                  >
                    <Minus className='h-4 w-4' />
                  </Button>
                  <span className='w-8 text-center'>{item.quantity}</span>
                  <Button
                    variant='outline'
                    size='icon'
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  >
                    <Plus className='h-4 w-4' />
                  </Button>
                  <Button
                    variant='destructive'
                    size='icon'
                    onClick={() => removeItem(item.id)}
                  >
                    <Trash2 className='h-4 w-4' />
                  </Button>
                </div>
              </div>
              <div className='text-right'>
                <p className='font-medium'>
                  ${(item.price * item.quantity).toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className='lg:col-span-4'>
          <div className='bg-gray-50 rounded-lg p-6'>
            <h2 className='text-lg font-medium mb-4'>Order Summary</h2>
            <div className='space-y-2'>
              <div className='flex justify-between'>
                <span>Subtotal</span>
                <span>${total.toFixed(2)}</span>
              </div>
              <div className='flex justify-between'>
                <span>Shipping</span>
                <span>Free</span>
              </div>
              <div className='border-t pt-2 mt-2'>
                <div className='flex justify-between font-medium'>
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
            <Button className='w-full mt-6'>Proceed to Checkout</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
