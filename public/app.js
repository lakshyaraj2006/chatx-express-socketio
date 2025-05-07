const socket = io("ws://localhost:3500");

let msgInput = document.querySelector('input#message');
let nameInput = document.querySelector('input#name');
let chatRoom = document.querySelector('input#room');
let activity = document.querySelector("p.activity");
let usersList = document.querySelector("p.user-list");
let roomsList = document.querySelector("p.room-list");
let chatDisplay = document.querySelector("ul.chat-display");

function sendMessage(e) {
    e.preventDefault();

    if (nameInput.value && msgInput.value && chatRoom.value) {
        socket.emit('message', {
            name: nameInput.value,
            text: msgInput.value
        });
        msgInput.value = "";
    }

    msgInput.focus();
}

function enterRoom(e) {
    e.preventDefault();

    if (nameInput.value && chatRoom.value) {
        socket.emit('enterRoom', {
            name: nameInput.value,
            room: chatRoom.value
        })
    }
}

document.querySelector('form.form-msg')
    .addEventListener('submit', sendMessage);

document.querySelector('form.form-join')
    .addEventListener('submit', enterRoom);

msgInput.addEventListener("keypress", (e) => {
    socket.emit('activity', nameInput.value);
});

// Listen for messages
socket.on('message', (data) => {
    activity.textContent = "";
    const { name, text, time } = data;

    let li = document.createElement('li');
    li.className = 'post';

    if (name === nameInput.value) li.className = 'post post--right';
    if (name !== nameInput.value && name !== 'Admin') li.className = 'post post--left';
    if (name !== 'Admin') {
        li.innerHTML = `<div class="post__header ${name === nameInput.value
            ? 'post__header--user'
            : 'post__header--reply'}"
        >
            <span class="post__header--name">${name}</span>
            <span class="post__header--time">${time}</span>
        </div>
        <div class="post__text">${text}</div>`
    } else {
        li.innerHTML = `<div class="post__text">${text}</div>`;
    }

    chatDisplay.appendChild(li);
    chatDisplay.scrollTop = chatDisplay.scrollHeight;
});

let activityTimer;
socket.on('activity', (name) => {
    activity.textContent = `${name} is typing...`;

    // Clear after 1 seconds
    clearTimeout(activityTimer);
    activityTimer = setTimeout(() => {
        activity.textContent = "";
    }, 3000);
});

function showUsers(users) {
    usersList.textContent = '';

    if (users) {
        usersList.innerHTML = `<em>Users in ${chatRoom.value}:</em>`;
        users.forEach((user, i) => {
            usersList.textContent += ` ${user.name}`;
            if (users.length > 1 && i !== users.length - 1) {
                usersList.textContent += ","
            }
        })
    }
}

socket.on('userList', ({ users }) => showUsers(users));

function showRooms(rooms) {
    roomsList.textContent = '';

    if (rooms) {
        roomsList.innerHTML = `<em>Active Rooms:</em>`;
        rooms.forEach((room, i) => {
            roomsList.textContent += ` ${room}`;
            if (rooms.length > 1 && i !== rooms.length - 1) {
                roomsList.textContent += ","
            }
        })
    }
};

socket.on('roomList', ({ rooms }) => showRooms(rooms));