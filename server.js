const fs = require('fs');
const https = require('https');
const express = require('express');
const app = express();
const socketio = require('socket.io')
app.use(express.static(__dirname))

const key = fs.readFileSync('cert.key');
const cert = fs.readFileSync('cert.crt');

const expressServer = https.createServer({key, cert}, app);
const io = socketio(expressServer, {
    cors: {
        origin: ["https://localhost", "https://192.168.158.104"],
        methods: ["GET", "POST"]
    }
});

const offers = [
    //on
    //o
    //ofice
    // ans
    //ans offer
    //offer
];

const connectedSocket =[

];

expressServer.listen(8181);
io.on('connection', (socket) => {
    // console.log("Someone has connected");
    const userName = socket.handshake.auth.userName;
    const password = socket.handshake.auth.password;

    if(password != "x"){
        socket.disconnect(true);
        return;
    }

    connectedSocket.push({
        socketId: socket.id,
        userName
    });

    // a new client has joined. If there are any offers available, emit them out

    if(offers.length){
        socket.emit('availableOffers', offers);
    }

    socket.on('newOffer', newOffer => {
        offers.push({
            offererUserName: userName,
            offer: newOffer,
            offerIceCandidates:[],
            answererUserName: null,
            answer: null,
            answererIceCandidates: []
        })
        // console.log(newOffer.spd);
        // send out to all connected sockets except the called
        // console.log(offers)
        socket.broadcast.emit('newOfferAwaiting', offers.slice(-1));
    })

    socket.on('newAnswer', (offerObj, ackFunction) => {

        console.log("---------newAnswer--------------")
        // console.log(offerObj);
        // emit this answer (offerObj) back to CLIENT1
        //in order to do that, we need CLIENT1 socketid
        const socketToAnswer = connectedSocket.find(s=> s.userName === offerObj.offererUserName);
        if(!socketToAnswer){
            console.log("No socketToAnswer");
            return;
        }
        // we found the matching socket, so we can emit to it!
        const socketIdToAnswer = socketToAnswer.socketId;
        // we dind the offer to update so we can emit it.
        const offerToUpdate = offers.find(o=>o.offererUserName === offerObj.offererUserName);
        if(!offerToUpdate){
            console.log("No offerToUpdate");
            return;
        }
        // send back to answerer all the icecandidate we have already collected
        ackFunction(offerToUpdate.offerIceCandidates);

        offerToUpdate.answer = offerObj.answer;
        offerToUpdate.answererUserName = userName;
        socket.to(socketIdToAnswer).emit('answerResponse', offerToUpdate);

    })

    socket.on('sendIceCandidateToSignalingServer', iceCandidateObj => {
        const {iceCandidate, iceUserName, didIOffer} = iceCandidateObj;
        // console.log(iceCandidate);

        
        if(didIOffer){
            //this ice is coming from the offerer. Send to the answerer
            const offerInOffers = offers.find(o=> o.offererUserName === iceUserName);
            if(offerInOffers){
                offerInOffers.offerIceCandidates.push(iceCandidate);
                // 1. when the answerer answer, all existing ice candidates are sent
                // 2. Any candidate that come in after the offer has been answered
                if(offerInOffers.answererUserName) {
                    // pass it through to the other socket
                    const socketToSendTo = connectedSocket.find(s=> s.userName == offerInOffers.answererUserName)
                    if(socketToSendTo) {
                        socket.to(socketToSendTo.socketId).emit('receivedIceCandidateFromServer', iceCandidate)
                    }else {
                        console.log("Ice candidate received but could not find answerer")
                    }
                }
                // come back here
                // if the answer is alrady here, emit the icecandidates to that user
            }
        }else {
            // this ice is coming from the answerer. Send to the offerer
            // pass it through to the other socket
            const offerInOffers = offers.find(o=> o.answererUserName === iceUserName);
            const socketToSendTo = connectedSocket.find(s=> s.userName == offerInOffers.offererUserName)
                    if(socketToSendTo) {
                        socket.to(socketToSendTo.socketId).emit('receivedIceCandidateFromServer', iceCandidate)
                    }else {
                        console.log("Ice candidate received but could not find offerer")
                    }
        }
        
        // console.log(offers);
    })
});