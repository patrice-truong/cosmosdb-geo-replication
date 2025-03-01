import { Server } from 'socket.io'
import { Socket } from 'socket.io'
import { createServer } from 'http'

const host = '127.0.0.1'
const port = 8000

console.log('Initializing server...')

const httpServer = createServer()
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
})

console.log('Socket.IO server created')

io.on('connection', (socket: Socket) => {
  console.log('=== New Client Connection ===')
  console.log('Socket ID:', socket.id)
  console.log('Client IP:', socket.handshake.address)

  socket.emit('test', { message: 'Hello from Socket.IO server!' })
  console.log('Test message sent to client')

  socket.on('message', (data: string) => {
    console.log('=== Message Received ===')
    console.log('From socket:', socket.id)
    console.log('Message content:', data)
    io.emit('message', data)
    console.log('Message broadcasted to all clients')
  })

  socket.on('disconnect', () => {
    console.log('=== Client Disconnected ===')
    console.log('Socket ID:', socket.id)
  })
})

httpServer.listen(port, host, () => {
  console.log('\n=== Server Started ===')
  console.log(`Host: ${host}`)
  console.log(`Port: ${port}`)
  console.log(`URL: http://${host}:${port}`)
  console.log('Waiting for connections...\n')
})
