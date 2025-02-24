import { NextResponse } from 'next/server'
import { io } from 'socket.io-client'
import { socket_url } from '@/models/constants'

export async function POST (request: Request) {
  try {
    const data = await request.json()

    const socket = io(socket_url, {
      path: '/api/socket'
    })

    socket.on('connect_error', error => {
      console.error('Socket connection error:', error.message)
    })

    await new Promise((resolve, reject) => {
      let hasResponded = false

      socket.on('connect', () => {
        socket.emit('cartChange', data)

        socket.on('ack', response => {
          if (!hasResponded) {
            hasResponded = true
            socket.disconnect()
            resolve(response)
          }
        })
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
    }, 30000) // 30 seconds instead of 10
  })
    return NextResponse.json({ success: true, data }, { status: 200 })
  } catch (error) {
    console.error('Cart change error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process cart change' },
      { status: 500 }
    )
  }
}
