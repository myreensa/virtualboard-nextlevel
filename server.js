const WebSocket = require('ws')
const jwt = require('jsonwebtoken')
const os = require('os')
const http = require('http')
require('dotenv').config()

const PORT = process.env.PORT || 5000

const server = http.createServer((req, res) => {
  res.writeHead(200)
  res.end("Websocket server running")
})

const wss = new WebSocket.Server({ server })

wss.on('connection', (ws, req) => {
  console.log('Client connected')


  const urlParams = new URLSearchParams(req.url.replace(/^\/\?/, ''))
  const token = urlParams.get('token')

  if (!token) {
    ws.send(JSON.stringify({ status: 1, msg: 'ERROR: Missing token.' }))
    ws.close(4000, 'MISSING_TOKEN')
    return
  }


  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    ws.user = payload
    console.log('Authenticated user:', payload)
  } catch (err) {
    console.log('Invalid token:', err.message)
    ws.send(JSON.stringify({ status: 1, msg: 'ERROR: Invalid or expired token.' }))
    ws.close(4001, 'INVALID_OR_EXPIRED_TOKEN')
    return
  }


  ws.on('message', (message) => {
    let msgObj

    try {
      msgObj = JSON.parse(message)
    } catch {
      msgObj = { text: message.toString() }
    }
    const payload = JSON.stringify({
      status: 0,
      type: 'paste:update',
      text: msgObj.text || '',
      from: ws.user?.sub || null,         
      freemem: Math.round(os.freemem() / 1024 / 1024),
      totalmem: Math.round(os.totalmem() / 1024 / 1024),
      ts: Date.now()
    })

    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload)
      }
    }
  })

  ws.on('close', (code, reason) => {
    console.log('Client disconnected', code, reason?.toString())
  })
})

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`)
})
