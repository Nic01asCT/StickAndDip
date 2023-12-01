const socket = io('/')
const videoGrid = document.getElementById('video-grid')
const myVideo = document.createElement('video')
myVideo.muted = true
const peerConnections = {}

navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: true
}).then(stream => {
    addVideoStream(myVideo, stream)

    const configuration = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' }
        ]
    }

    socket.on('user-connected', userId => {
        const peerConnection = createPeerConnection(configuration, stream)
        peerConnections[userId] = peerConnection
        handlePeerConnection(peerConnection, userId)
    })

    socket.on('user-disconnected', userId => {
        if (peerConnections[userId]) {
            peerConnections[userId].close()
            delete peerConnections[userId]
        }
    })

    socket.emit('join-room', ROOM_ID)
})

socket.on('ice-candidate', ({ candidate, from }) => {
    const peerConnection = peerConnections[from]
    if (peerConnection) {
        peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
    }
})

function handlePeerConnection(peerConnection, userId) {
    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            socket.emit('ice-candidate', { candidate: event.candidate, to: userId })
        }
    }

    peerConnection.ontrack = event => {
        const userVideo = document.createElement('video')
        userVideo.srcObject = event.streams[0]
        userVideo.autoplay = true
        userVideo.playsinline = true
        videoGrid.append(userVideo)
    }

    peerConnection.createOffer().then(offer => {
        peerConnection.setLocalDescription(new RTCSessionDescription(offer))

        // Send the offer to the other user
        socket.emit('offer', { offer, to: userId })
    })
}

function createPeerConnection(configuration, stream) {
    const peerConnection = new RTCPeerConnection(configuration)
    stream.getTracks().forEach(track => peerConnection.addTrack(track, stream))
    return peerConnection
}

function addVideoStream(video, stream) {
    video.srcObject = stream
    video.addEventListener('loadedmetadata', () => {
        video.play()
    })
    videoGrid.append(video)
}