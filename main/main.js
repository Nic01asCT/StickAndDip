import './style.css'

import firebase from 'firebase/app'
import 'firebase/firestore'

const firebaseConfig = {
    apiKey: 'AIzaSyDbBjcMgLcWgRxR1HaK9oeby7qLGtj8emM',
    authDomain: 'sticknserver.firebaseapp.com',
    projectId: 'sticknserver',
    storageBucket: 'sticknserver.appspot.com',
    messagingSenderId: '298579127567',
    appId: '1:298579127567:web:01b97428662402a726227a',
    measurementId: 'G-CP47PTMDWX'
}

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig)
}
const firestore = firebase.firestore()

const servers = {
    iceServers: [
        {
            urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
        },
    ],
    iceCandidatePoolSize: 10,
}

const pc = new RTCPeerConnection(servers)
let localStream = null
let remoteStream = null

const webcamButton = document.getElementById('webcamButton')
const webcamVideo = document.getElementById('webcamVideo')
const callButton = document.getElementById('callButton')
const callInput = document.getElementById('callInput')
const answerButton = document.getElementById('answerButton')
const remoteVideo = document.getElementById('remoteVideo')
const hangupButton = document.getElementById('hangupButton')

webcamButton.onclick = async () => {
    const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
            displaySurface: 'monitor',
        },
        audio: false
    })

    localStream = mediaStream
    remoteStream = new MediaStream()

    localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream)
    })

    pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
            remoteStream.addTrack(track)
        })
    }

    webcamVideo.srcObject = localStream
    remoteVideo.srcObject = remoteStream

    callButton.disabled = false
    answerButton.disabled = false
    webcamButton.disabled = true
}

callButton.onclick = async () => {
    const callDoc = firestore.collection('calls').doc()
    const offerCandidates = callDoc.collection('offerCandidates')
    const answerCandidates = callDoc.collection('answerCandidates')

    callInput.value = callDoc.id

    pc.onicecandidate = (event) => {
        event.candidate && offerCandidates.add(event.candidate.toJSON())
    }

    const offerDescription = await pc.createOffer()
    await pc.setLocalDescription(offerDescription)

    const offer = {
        sdp: offerDescription.sdp,
        type: offerDescription.type,
    }

    await callDoc.set({ offer })

    callDoc.onSnapshot((snapshot) => {
        const data = snapshot.data()
        if (!pc.currentRemoteDescription && data?.answer) {
            const answerDescription = new RTCSessionDescription(data.answer)
            pc.setRemoteDescription(answerDescription)
        }
    })

    answerCandidates.onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
                const candidate = new RTCIceCandidate(change.doc.data())
                pc.addIceCandidate(candidate)
            }
        })
    })

    hangupButton.disabled = false
}

answerButton.onclick = async () => {
    const callId = callInput.value
    const callDoc = firestore.collection('calls').doc(callId)
    const answerCandidates = callDoc.collection('answerCandidates')
    const offerCandidates = callDoc.collection('offerCandidates')

    pc.onicecandidate = (event) => {
        event.candidate && answerCandidates.add(event.candidate.toJSON())
    }

    const callData = (await callDoc.get()).data()

    const offerDescription = callData.offer
    await pc.setRemoteDescription(new RTCSessionDescription(offerDescription))

    const answerDescription = await pc.createAnswer()
    await pc.setLocalDescription(answerDescription)

    const answer = {
        type: answerDescription.type,
        sdp: answerDescription.sdp,
    }

    await callDoc.update({ answer })

    offerCandidates.onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
            console.log(change)
            if (change.type === 'added') {
                let data = change.doc.data()
                pc.addIceCandidate(new RTCIceCandidate(data))
            }
        })
    })
}