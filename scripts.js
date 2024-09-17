const userName = "Praful-"+Math.floor(Math.random() * 100000);
const password = "x";
document.querySelector('#user-name').innerHTML = userName;


const socket = io.connect('https://192.168.158.104:8181/', { //localhost
    auth: {
        userName, password
    }
});

const localVideoEl = document.querySelector('#local-video');
const remoteVideoEl = document.querySelector('#remote-video');

let localStream;
let remoteStream;
let peerConnection;
let didIOffer = false;


let peerConfiguration = {
    iceServers:[
        {
            urls:[
              'stun:stun.l.google.com:19302',
              'stun:stun1.l.google.com:19302'
            ]
        }
    ]
}

const call = async e => {
    await fetchUserMedia();

    // peer connection is all set with out STUN servers sent over
    await createPeerConnection();

    try {

        console.log("Creating offer");
        const offer = await peerConnection.createOffer();
        console.log(offer);
        peerConnection.setLocalDescription(offer);
        didIOffer = true;
        socket.emit('newOffer', offer); //send offer to signalling server

    }catch(err) {
        console.log(err);
    }
}

const answerOffer = async(offerObj)=>{
    await fetchUserMediaBack()
    // peer connection is all set with out STUN servers sent over
    await createPeerConnection(offerObj);
    const answer = await peerConnection.createAnswer({}); // doc hgappy
    await peerConnection.setLocalDescription(answer); // this is CLIENT2, and CLIENT2 uses the answer as the local description.
    console.log(offerObj)
    console.log(answer)
    // console.log(peerConnection.signalingState); // should be have-local-pranswer, bcz client2 has set its local desc to its answer (but it won't be)


    //add the answer to offerObj so the server knows which offer this is related to
    offerObj.answer = answer;

    // emit the answer to the signaling server, so it can emit to CLIENT1
    // expect a response from the server from an existing  ICE candidite
    // socket.emit('newAnswer', offerObj);
    const offerIceCandidate = await socket.emitWithAck('newAnswer', offerObj);
    offerIceCandidate.forEach(c=>{
        peerConnection.addIceCandidate(c);
        console.log("--------addIceCandidate--------")
    })
    console.log(offerIceCandidate)
}

const addAnswer = async (offerObj) =>{
    // add answer is called in socket listenner when an answerResponse is emmited
    // at this point, the offer and answer have been exchanged
    // now Client1 need to set remote desc
    await peerConnection.setRemoteDescription(offerObj.answer);
    // console.log(peerConnection.signalingState);  
}

const fetchUserMedia = () => {
    return new Promise(async (resolve, reject)=>{
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                // audio: true
            });
            localVideoEl.srcObject = stream;
            localStream = stream;
            resolve();
        }catch(err){
            console.log(err);
            reject();
        }
    })
}

const fetchUserMediaBack = () => {
    return new Promise(async (resolve, reject)=>{
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            let backCameraDeviceId = null;

            // Look for a device labeled as 'back' or 'rear'
            for (let device of videoDevices) {
                if (device.label.toLowerCase().includes('back') || device.label.toLowerCase().includes('rear')) {
                    backCameraDeviceId = device.deviceId;
                    break;
                }
            }

            // If no back camera is found, use the first video device
            if (!backCameraDeviceId && videoDevices.length > 0) {
                backCameraDeviceId = videoDevices[0].deviceId;
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    deviceId: backCameraDeviceId ? { exact: backCameraDeviceId } : undefined
                },
                // audio: true
            });
            localVideoEl.srcObject = stream;
            localStream = stream;
            resolve();
        }catch(err){
            console.log(err);
            reject();
        }
    })
}

const createPeerConnection = (offerObj) => {
  return new Promise(async (resolve, reject) => {
    // rtc peer connection is a constructor that creates a new RTCPeerConnection
    // object. This object represents a WebRTC connection between the local
    // computer and a remote peer.
    peerConnection = await new RTCPeerConnection(peerConfiguration);

    remoteStream = new MediaStream()
    remoteVideoEl.srcObject = remoteStream;

    localStream.getTracks().forEach(track => {
        // add localtracks so that they can be sent once the connection is established
        peerConnection.addTrack(track, localStream);
    });

    peerConnection.addEventListener("signalingstatechange", (event) => {
        console.log(event);
        console.log(peerConnection.signalingState);
    });

    peerConnection.addEventListener("icecandidate", (e) => {
        // console.log(".......ICE candidate Found.....")
        // console.log(e);
        if(e.candidate){
            socket.emit('sendIceCandidateToSignalingServer', {
                iceCandidate: e.candidate,
                iceUserName: userName,
                didIOffer
            });
        }
    
    });


    peerConnection.addEventListener('track', e=>{
        console.log("Got a track from other peer!! How exciting");
        console.log(e);
        e.streams[0].getTracks().forEach(track=>{
            remoteStream.addTrack(track, remoteStream);
            console.log("Finger crossed================")
        })
    })

    if(offerObj){
        // this won't be set whan called from call()
        //will be set when we call from answerOffer()
        // console.log(peerConnection.signalingState); // should be stable because no setDesc has been run yet
        await peerConnection.setRemoteDescription(offerObj.offer);
        // console.log(peerConnection.signalingState); // should be hav-remote-offer, because client2 has set remote desc on offer
    }
    resolve();
  });
};

const addNewIceCandidate = iceCandidate=>{
    peerConnection.addIceCandidate(iceCandidate);
    console.log("--------added----IceCandidate--------");
}

document.querySelector('#call').addEventListener('click', call);