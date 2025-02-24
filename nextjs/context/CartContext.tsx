'use client'

export const dynamic = 'force-dynamic' // Ensure dynamic rendering

import { api_url, socket_url, userName } from '@/models/constants'
import { createContext, useContext, useEffect, useState } from 'react'

import { Cart } from '@/models/cart'
import { CartContextType } from '@/models/cartContextType'
import { CartItem } from '@/models/cartItem'
import { io } from 'socket.io-client'

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
        if (savedCart && !isSocketUpdate) {
          // Only update if not from socket
          const items = savedCart.data.items
          console.log(`[${prefix}::loadCart]`, items)
          setItems(items)
        }
      } catch (error) {
        console.error('Error loading cart:', error)
      }
    }

    loadCart()
  }, [isSocketUpdate])

  useEffect(() => {
    const socketInstance = io(
      socket_url,

      {
        path: '/api/socket',
        addTrailingSlash: false
      }
    )

    socketInstance.on('connect', () => {
      console.log('Connected')
    })

    socketInstance.on('cartUpdate', async data => {
      console.log('Cart update received from socket:', data)
      if (data.userName === userName) {
        setIsSocketUpdate(true) // Set flag before updating items
        setItems(data.items)
      }
    })

    socketInstance.on('disconnect', () => {
      console.log('Disconnected - attempting reconnect')
      socketInstance.connect()
    })

    socketInstance.on('connect_error', async err => {
      console.log(`connect_error due to ${err.message}`)
      await fetch('/api/socket')
    })

    setSocket(socketInstance)

    // Cleanup function to disconnect socket when component unmounts
    return () => {
      socketInstance.disconnect()
    }
  }, []) // Add items as dependency

  useEffect(() => {
    console.log('Items state changed:', items)

    const storeCart = async () => {
      try {
        const cart: Cart = {
          userName: userName,
          items: items
        }
        // Only store if not a socket update
        if (!isSocketUpdate) {
          await storeCartInCosmosDB(cart)
        }
      } catch (error) {
        console.error('Error storing cart:', error)
      }
    }

    if (items.length > 0) {
      storeCart()
    }
  }, [items, isSocketUpdate])

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
          'X-Client-Update': 'true' // Add this header to identify client updates
        },
        body: JSON.stringify(cart)
      })
    } catch (error) {
      console.error('Error storing cart in Cosmos DB:', error)
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
