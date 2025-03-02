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
    const socket = io(socket_url, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    })

    socket.on('connect', () => {
      console.log('Connected')
    })

    socket.on('cartChange', async data => {
      console.log('CartChange received from socket:', data)
      if (data.userName === userName) {
        setIsSocketUpdate(true) // Set flag before updating items
        setItems(data.items)
      }
    })

    socket.on('cartDeleted', async data => {
      console.log('Cart deleted received from socket:', data)
      if (data.userName === userName) {
        setIsSocketUpdate(true) // Set flag before updating items
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
    console.log('Items state changed:', items)

    const storeCart = async () => {
      try {
        if (items.length === 0) {
          // Delete the cart when it becomes empty
          await fetch(`${api_url}/api/cart?userName=${userName}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'X-Client-Update': 'true'
            }
          })
        } else {
          const cart: Cart = {
            userName: userName,
            items: items
          }
          await storeCartInCosmosDB(cart)
        }
      } catch (error) {
        console.error('Error managing cart:', error)
      }
    }

    // Always store cart updates, even when empty
    storeCart()

    // Reset isSocketUpdate after processing
    setIsSocketUpdate(false)
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
