// app/context/CartContext.tsx

'use client'

export const dynamic = 'force-dynamic' // Ensure dynamic rendering

import { api_url, userName } from '@/models/constants'
import { createContext, useContext, useEffect, useState } from 'react'

import { Cart } from '@/models/cart'
import { CartContextType } from '@/models/cartContextType'
import { CartItem } from '@/models/cartItem'
import { io } from 'socket.io-client'
import { socket_url } from '@/models/constants'

export const CartContext = createContext<CartContextType | undefined>(undefined)
const prefix = '/context/CartContext.tsx'

export function CartProvider ({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [socket, setSocket] = useState<any>(null)
  const [isSocketUpdate, setIsSocketUpdate] = useState(false)

  useEffect(() => {
    async function loadCart () {
      try {
        const savedCart = await loadCartFromCosmosDB(userName)
        if (savedCart?.data?.items) {
          console.log(`[${prefix}::loadCart]`, savedCart.data.items)
          setItems(savedCart.data.items)
        }
      } catch (error) {
        console.error('Error loading cart:', error)
      }
    }

    if (!isSocketUpdate) {
      loadCart()
    }
  }, []) // Remove isSocketUpdate dependency

  useEffect(() => {
    console.log(`[***************** ${prefix}::useEffect] *****************`)
    const socket = io('http://127.0.0.1:8000', {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    })

    socket.on('cartChange', data => {
      console.log(`CartChange received from socket: `, data)

      // Find the matching cart data
      const userCart = data.find(
        (item: { userName: string }) => item.userName === userName
      )
      if (userCart) {
        console.log('Found matching cart:', userCart.items)
        // Batch the updates together
        Promise.resolve().then(() => {
          setIsSocketUpdate(true)
          setItems(userCart.items)
        })
      }
    })

    socket.on('cartEmpty', data => {
      console.log('cartEmpty received from socket:', data)
      if (data.userName === userName) {
        setIsSocketUpdate(true)
        console.log('Emptying cart from socket')
        setItems([])
      }
    })
    socket.on('disconnect', () => {
      console.log('Disconnected - attempting reconnect')
      socket.connect()
    })

    setSocket(socket)

    // Cleanup function to disconnect socket when component unmounts
    return () => {
      socket.disconnect()
    }
  }, []) // Add items as dependency

  useEffect(() => {
    if (!items.length) return; // Skip empty items

    console.log('Items state changed:', items)
    let isStale = false;

    const storeCart = async () => {
      if (isSocketUpdate) {
        console.log('Skipping Cosmos DB update for socket-initiated change')
        setIsSocketUpdate(false)
        return
      }

      if (isStale) return; // Skip if component updated

      try {
        const cart: Cart = {
          userName: userName,
          items: items
        }
        await storeCartInCosmosDB(cart)
      } catch (error) {
        console.error('Error managing cart:', error)
      }
    }

    storeCart()

    return () => {
      isStale = true;
    }
  }, [items])
  const addItem = (newItem: Omit<CartItem, 'quantity'>) => {
    setItems(currentItems => {
      const existingItem = currentItems.find(item => item.id === newItem.id)
      if (existingItem) {
        return currentItems.map(item =>
          item.id === newItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...currentItems, { ...newItem, quantity: 1 }]
    })
  }
  const removeItem = (id: number) => {
    setItems(currentItems => currentItems.filter(item => item.id !== id))
  }
  const updateQuantity = (id: number, quantity: number) => {
    setItems(currentItems =>
      currentItems.map(item => (item.id === id ? { ...item, quantity } : item))
    )
  }
  const clearCart = () => {
    setItems([])
  }
  // load cart from Cosmos DB
  const loadCartFromCosmosDB = async (userName: string) => {
    try {
      const response = await fetch(`${api_url}/api/cart?userName=${userName}`)
      const result = await response.json()
      console.log(`[${prefix}::loadCartFromCosmosDB] ${JSON.stringify(result)}`)
      return result
    } catch (error) {
      console.error('Error fetching cart:', error)
      return error
    }
  }
  // Function to store cart in Cosmos DB
  const storeCartInCosmosDB = async (cart: Cart) => {
    try {
      console.log(`[${prefix}::storeCartInCosmosDB] ${JSON.stringify(cart)}`)
      const response = await fetch(`${api_url}/api/cart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Update': 'true'
        },
        body: JSON.stringify(cart)
      })
      return await response.json()
    } catch (error) {
      console.error('Error storing cart in Cosmos DB:', error)
      throw error
    }
  }

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart () {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
