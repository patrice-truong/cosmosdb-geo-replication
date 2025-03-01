'use client'

import { useEffect, useState } from 'react'

import { io } from 'socket.io-client'

export default function ChatBox () {
  const [message, setMessage] = useState('')
  const [socket, setSocket] = useState<any>(null)
  const [response, setResponse] = useState('')
  const [messages, setMessages] = useState<string[]>([])

  useEffect(() => {
    const host = '127.0.0.1'
    const port = 8000
    const socketInstance = io('http://172.172.95.148:8000', {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    })
    setSocket(socketInstance)

    socketInstance.on('test', data => {
      console.log('Received test message:', data)
      setResponse(data.message)
    })

    socketInstance.on('message', data => {
      console.log('Received message:', data)
      setMessages(prev => [...prev, data])
    })

    return () => {
      socketInstance.disconnect()
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (socket && message) {
      console.log('Sending message:', message)
      socket.emit('message', message)
      setMessage('')
    }
  }

  return (
    <div className='w-full max-w-md'>
      <form onSubmit={handleSubmit} className='space-y-4'>
        <div>
          <input
            type='text'
            value={message}
            onChange={e => setMessage(e.target.value)}
            className='w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700'
            placeholder='Type your message...'
          />
        </div>
        <button
          type='submit'
          className='w-full bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 transition-colors'
        >
          Send Message
        </button>
      </form>
      {response && (
        <div className='mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-md'>
          <p>Server response: {response}</p>
        </div>
      )}
      <div className='mt-4 space-y-2'>
        {messages.map((msg, index) => (
          <div
            key={index}
            className='p-2 bg-gray-100 dark:bg-gray-800 rounded-md'
          >
            {msg}
          </div>
        ))}
      </div>
    </div>
  )
}
