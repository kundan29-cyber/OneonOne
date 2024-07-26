import { io } from 'socket.io-client';

let peer;
const myVideo = document.getElementById('my-video');
const strangerVideo = document.getElementById('video');
const button = document.getElementById('send');
const online = document.getElementById('online');
let remoteSocket;
let type;
let roomid;

function start() {
  navigator.mediaDevices.getUserMedia({ audio: true, video: true })
    .then(stream => {
      if (peer) {
        myVideo.srcObject = stream;
        stream.getTracks().forEach(track => peer.addTrack(track, stream));

        peer.ontrack = e => {
          strangerVideo.srcObject = e.streams[0];
          strangerVideo.play();
        }
      }
    })
    .catch(ex => {
      console.log(ex);
    });
}

const socket = io('http://localhost:8000');

socket.on('disconnected', () => {
  location.href = `/?disconnect`
})

socket.emit('start', (person) => {
  type = person;
});

socket.on('remote-socket', (id) => {
  remoteSocket = id;
  document.querySelector('.modal').style.display = 'none';
  peer = new RTCPeerConnection();
  peer.onnegotiationneeded = async e => {
    webrtc();
  }
  peer.onicecandidate = e => {
    socket.emit('ice:send', { candidate: e.candidate, to: remoteSocket });
  }
  start();
});

async function webrtc() {
  if (type == 'p1') {
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    socket.emit('sdp:send', { sdp: peer.localDescription });
  }
}

socket.on('sdp:reply', async ({ sdp, from }) => {
  await peer.setRemoteDescription(new RTCSessionDescription(sdp));
  if (type == 'p2') {
    const ans = await peer.createAnswer();
    await peer.setLocalDescription(ans);
    socket.emit('sdp:send', { sdp: peer.localDescription });
  }
});

socket.on('ice:reply', async ({ candidate, from }) => {
  await peer.addIceCandidate(candidate);
});

socket.on('roomid', id => {
  roomid = id;
})

button.onclick = e => {
  let input = document.querySelector('input').value;
  socket.emit('send-message', input, type, roomid);
  let msghtml = `
  <div class="msg">
  <b>You: </b> <span id='msg'>${input}</span>
  </div>
  `
  document.querySelector('.chat-holder .wrapper')
    .innerHTML += msghtml;
  document.querySelector('input').value = '';
}

socket.on('get-message', (input, type) => {
  let msghtml = `
  <div class="msg">
  <b>Stranger: </b> <span id='msg'>${input}</span>
  </div>
  `
  document.querySelector('.chat-holder .wrapper')
    .innerHTML += msghtml;
})