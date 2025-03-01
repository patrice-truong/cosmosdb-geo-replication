// app/api/cartIsEmpty/route.ts

import { NextResponse } from 'next/server'
import { io } from 'socket.io-client'
import { socket_url } from '@/models/constants'

console.log('[cartIsEmpty] socket_url=' + socket_url)

export async function POST (request: Request) {
  try {
    const data = await request.json()
    console.log('[cartEmpty event received]:', JSON.stringify(data))

    const socket = io(socket_url, {
      path: '/api/socket'
    })

    socket.on('connect_error', error => {
      console.error('Socket connection error:', error.message)
    })

    await new Promise((resolve, reject) => {
      let hasResponded = false

      socket.on('connect', () => {
        console.log(
          '[socket connect] Sending cart deleted:',
          JSON.stringify(data)
        )
        socket.emit('cartEmpty', data)
        // Resolve immediately after sending
        if (!hasResponded) {
          hasResponded = true
          socket.disconnect()
          resolve({ sent: true })
        }
      })

      socket.on('error', error => {
        if (!hasResponded) {
          hasResponded = true
          socket.disconnect()
          reject(error)
        }
      })
      // Increase timeout to 30 seconds
      setTimeout(() => {
        if (!hasResponded) {
          hasResponded = true
          socket.disconnect()
          reject(new Error('Socket connection timeout'))
        }
      }, 30000)
    })
    return NextResponse.json({ success: true, data }, { status: 200 })
  } catch (error) {
    console.error('Cart deleted error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process cart deletion' },
      { status: 500 }
    )
  }
}
