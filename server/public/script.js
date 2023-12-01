const socket = io('/')
const videoGrid = document.getElementById('video-grid')
const myVideo = document.createElement('video')
myVideo.muted = true
const peers = {}

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

    const myPeerConnection = new RTCPeerConnection(configuration)
    stream.getTracks().forEach(track => myPeerConnection.addTrack(track, stream))

    socket.on('user-connected', userId => {
        connectToNewUser(userId, stream, myPeerConnection, configuration);
    })

    socket.on('user-disconnected', userId => {
        if (peers[userId]) {
            peers[userId].close()
            delete peers[userId]
        }
    })

    myPeerConnection.onicecandidate = event => {
        if (event.candidate) {
            socket.emit('ice-candidate', { candidate: event.candidate, to: userId })
        }
    }

    myPeerConnection.ontrack = event => {
        const userVideo = document.createElement('video')
        userVideo.srcObject = event.streams[0]
        userVideo.autoplay = true
        userVideo.playsinline = true
        videoGrid.append(userVideo)
    }

    socket.emit('join-room', ROOM_ID)
})

socket.on('ice-candidate', ({ candidate, from }) => {
    const peerConnection = peers[from]
    if (peerConnection) {
        peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
    }
})

function connectToNewUser(userId, stream, myPeerConnection, configuration) {
    const peerConnection = new RTCPeerConnection(configuration)
    stream.getTracks().forEach(track => peerConnection.addTrack(track, stream))

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

    myPeerConnection.createOffer().then(offer => {
        myPeerConnection.setLocalDescription(new RTCSessionDescription(offer))
        peerConnection.setRemoteDescription(new RTCSessionDescription(offer))

        peerConnection.createAnswer().then(answer => {
            peerConnection.setLocalDescription(new RTCSessionDescription(answer))
            myPeerConnection.setRemoteDescription(new RTCSessionDescription(answer))
        })
    })

    peers[userId] = peerConnection
}

function addVideoStream(video, stream) {
    video.srcObject = stream
    video.addEventListener('loadedmetadata', () => {
        video.play()
    })
    videoGrid.append(video)
}
