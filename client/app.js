const { app, BrowserWindow, ipcMain } = require('electron')
const { v4: uuidv4 } = require('uuid')
const screenshot = require('screenshot-desktop')

const robot = require('robotjs')

const socket = require('socket.io-client')('http://192.168.1.227:5000')
var interval

const createWindow = () => {
    const win = new BrowserWindow({
        width: 500,
        height: 150,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    })

    win.removeMenu()
    win.loadFile('index.html')

    socket.on('mouse-move', (data) => {
        const { x, y } = JSON.parse(data)
        robot.mouseMove(x, y)
    })

    socket.on('mouse-click', (data) => {
        robot.mouseClick()
    })

    socket.on('type', (data) => {
        const { key } = JSON.parse(data)
        robot.keyTap(key)
    })
}

app.whenReady().then(() => createWindow())

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})

app.on('active', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

ipcMain.on('start-share', function(event, arg) {
    const uuid = uuidv4()
    socket.emit('join-message', uuid)
    event.reply('uuid', uuid)

    interval = setInterval(() => {
        screenshot().then((img) => {
            const imgStr = Buffer.from(img).toString('base64')

            var obj = {}
            obj.room = uuid
            obj.image = imgStr

            socket.emit('screen-data', JSON.stringify(obj))
        })
    }, 100)
})

ipcMain.on('stop-share', function(event, arg) {
    clearInterval(interval)
})