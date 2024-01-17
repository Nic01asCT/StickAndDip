const express = require('express')
const http = require('http')
const socketIO = require('socket.io')
const cors = require('cors')

const app = express()
const httpServer = http.createServer(app)

const io = socketIO(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
})

app.use(cors())

app.get('/view', (req, res) => {
    res.sendFile(__dirname + '/display.html')
})

io.on('connection', (socket)=> {
    socket.on('join-message', (roomId) => {
        socket.join(roomId)
        console.log('User joined in a room : ' + roomId)
    })

    socket.on('screen-data', (data) => {
        data = JSON.parse(data)
        const room = data.room
        const imgStr = data.image
        socket.broadcast.to(room).emit('screen-data', imgStr)
    })

    socket.on('mouse-move', (data) => {
        const { room } = JSON.parse(data)
        socket.broadcast.to(room).emit('mouse-move', data)
    })

    socket.on('mouse-click', (data) => {
        const { room } = JSON.parse(data)
        socket.broadcast.to(room).emit('mouse-click', data)
    })

    socket.on('type', (data) => {
        const { room } = JSON.parse(data)
        socket.broadcast.to(room).emit('type', data)
    })
})

const server_port = process.env.PORT || 5000
httpServer.listen(server_port, () => {
    console.log('Started on : '+ server_port)
})