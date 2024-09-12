
//on connection get all available offers and call createOfferEls
socket.on('availableOffers', offers => {
    // console.log("------availableOffers------");
    console.log(offers);
    createOfferEls(offers);
});

//some one just made a new offer and we are already here- call creatOfferEls
socket.on('newOfferAwaiting', offers =>{
    // console.log("------newOfferAwaiting------");
    createOfferEls(offers);
});

socket.on('answerResponse', offerObj =>{
    // console.log("-----answerResponse-----")
    console.log(offerObj);
    addAnswer(offerObj);

})

socket.on('receivedIceCandidateFromServer', iceCandidate=>{
    addNewIceCandidate(iceCandidate);
    console.log(iceCandidate);
})

function createOfferEls(offers){
    // make green
    const answerEl = document.querySelector('#answer');
    offers.forEach(o => {
        console.log(o);
        const newOfferEl = document.createElement('div');
        newOfferEl.innerHTML = `<butten class="btn btn-success cal-1">Answer-${o.offererUserName}</button>`
        newOfferEl.addEventListener('click', ()=>answerOffer(o))
        answerEl.append(newOfferEl);
    });

}