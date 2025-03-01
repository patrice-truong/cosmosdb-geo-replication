// app/models/constants.ts
export const userName = 'patrice.truong@gmail.com'
export const api_url = 'http://localhost:4000'

const SOCKET_HOST = process.env.SOCKET_HOST || 'localhost'
const SOCKET_PORT = process.env.SOCKET_PORT || '3001'
export const socket_url = `http://${SOCKET_HOST}:${SOCKET_PORT}`
