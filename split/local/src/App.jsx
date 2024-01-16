import { useState, useRef } from 'react'

import firebase from 'firebase/app'
import 'firebase/firestore'

export default function App() {
    const streamRef = useRef(null)
    const remoteRef = useRef(null)

    const [call, setCall] = useState(false)
    const [callInput, setCallInput] = useState('')
    const [answer, setAnswer] = useState(false)
    const [stream, setStream] = useState(true)
    const [hangup, setHangup] = useState(false)
    const [localStream, setLocalStream] = useState(null)
    const [remoteStream, setRemoteStream] = useState(null)

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

    const handleStream = async () => {
        const remote = new MediaStream()

        const mediaStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
                displaySurface: 'monitor',
            },
            audio: false,
        })

        setLocalStream(mediaStream)
        setRemoteStream(remote)

        mediaStream.getTracks().forEach((track) => {
            pc.addTrack(track, mediaStream)
        })

        pc.ontrack = (event) => {
            event.streams[0].getTracks().forEach((track) => {
                remote.addTrack(track)
            })
        }

        if (streamRef.current) streamRef.current.srcObject = mediaStream
        if (remoteRef.current) remoteRef.current.srcObject = remote

        setCall(false)
        setAnswer(false)
        setStream(true)
    }

    const handleCall = async () => {
        const callDoc = firestore.collection('calls').doc()
        const offerCandidates = callDoc.collection('offerCandidates')
        const answerCandidates = callDoc.collection('answerCandidates')

        setCallInput(callDoc.id)

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
    }

    const handleAnswer = async () => {
        const callId = callInput
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
                if (change.type === 'added') {
                    const data = change.doc.data()
                    pc.addIceCandidate(new RTCIceCandidate(data))
                }
            })
        })
    }

    const handleChange = (e) => { setCallInput(e.target.value) }

    return (
        <>
        <h2>1. Start your Webcam</h2>
        <div className='videos'>
            <span>
                <h3>Local Stream</h3>
                <video ref={streamRef} autoPlay playsInline></video>
            </span>
            <span>
                <h3>Remote Stream</h3>
                <video ref={remoteRef} autoPlay playsInline></video>
            </span>
        </div>

        <button onClick={handleStream} disabled={!stream}>Start webcam</button>
        <h2>2. Create a new Call</h2>
        <button onClick={handleCall} disabled={call}>Create Call (offer)</button>

        <h2>3. Join a Call</h2>
        <p>Answer the call from a different browser window or device</p>
        
        <input onChange={handleChange} value={callInput}/>
        <button onClick={handleAnswer} disabled={answer}>Answer</button>

        <h2>4. Hangup</h2>

        <button disabled={!hangup}>Hangup</button>
        </>
    )
}