/* app/api/socket/route.ts */

import { NextResponse } from 'next/server'
import { Server } from 'socket.io'
import { createServer } from 'http'

const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/api/socket',
  addTrailingSlash: false,
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
})

io.on('connection', socket => {
  console.log('A client connected')

  socket.on('cartChange', data => {
    try {
      console.log('Received cartChange:', data)
      // Only broadcast if it's from change feed
      if (data.isChangeFeed) {
        io.emit('cartUpdate', data)
      }

      // Send acknowledgment
      socket.emit('ack', { success: true, data })
    } catch (error) {
      console.error('Error in cartChange:', error)
      socket.emit('ack', {
        success: false,
        error: 'Failed to process cart change'
      })
    }
  })

  socket.on('disconnect', () => {
    console.log('A client disconnected')
  })
})

const port = 3001
httpServer.listen(port, () => {
  console.log(`Socket.IO server running on port ${port}`)
})

export async function GET () {
  return NextResponse.json({ success: true }, { status: 200 })
}
