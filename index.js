import express from "express";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = process.env.PORT || 3500;

const ADMIN = "Admin";

const app = express();

app.use(express.static(path.join(__dirname, "public")));

const expressServer = app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});

// state
const UsersState = {
    users: [],
    setUsers: function (newUsersArray) {
        this.users = newUsersArray;
    }
}

const io = new Server(expressServer, {
    cors: {
        origin: process.env.NODE_ENV === "production" ? false : ["http://localhost:5500", "http://127.0.0.1:5500"]

    }
});

io.on('connection', (socket) => {
    console.log(`User ${socket.id} connected`);

    // Upon connection - only to user
    socket.emit('message', buildMsg(ADMIN, 'Welcome to Chat app!'));

    socket.on('enterRoom', ({ name, room }) => {

        // leave previous room
        const prevRoom = getUser(socket.id)?.room;

        if (prevRoom) {
            socket.leave(prevRoom);
            io.to(prevRoom).emit('message', buildMsg(ADMIN, `${name} has left the room`))
        }

        const user = activateUser(socket.id, name, room);

        if (prevRoom) {
            io.to(prevRoom).emit('userList', {
                users: getUsersInRoom(room)
            })
        }

        // join room
        socket.join(user.room);

        // To user who joined
        socket.emit('message', buildMsg(ADMIN, `You have joined the ${user.room} chatroom!`));

        // To everyone else
        socket.broadcast.to(user.room).emit('message', buildMsg(ADMIN, `${user.name} has joined the room`));

        // Update user list for room
        io.to(user.room).emit('userList', {
            users: getUsersInRoom(user.room)
        })

        // Update rooms list for everyone
        io.emit('roomList', {
            rooms: getAllActiveRooms()
        })
    })

    // When user disconnects - to all others
    socket.on('disconnect', () => {
        const user = getUser(socket.id);
        userLeavesApp(socket.id);

        if (user) {
            io.to(user.room).emit('message', buildMsg(ADMIN, `${user.name} has left the room`));

            io.to(user.room).emit('userList', {
                users: getUsersInRoom(user.room)
            });

            io.to(user.room).emit('roomList', {
                rooms: getAllActiveRooms()
            })
        }

        console.log(`User ${socket.id} disconnected`);
    });

    socket.on('message', ({ name, text }) => {
        const room = getUser(socket.id)?.room;

        if (room) {
            io.to(room).emit('message', buildMsg(name, text));
        }
    });

    // Listen for activity
    socket.on('activity', (name) => {
        const room = getUser(socket.id)?.room;

        if (room) {
            socket.broadcast.to(room).emit('activity', name);
        }
    })
});

function buildMsg(name, text) {
    return {
        name,
        text,
        time: new Intl.DateTimeFormat('default', {
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric'
        }).format(new Date())
    }
}

// User functions
function activateUser(id, name, room) {
    const user = { id, name, room };

    UsersState.setUsers([
        ...UsersState.users.filter(u => u.id !== id),
        user
    ]);

    return user;
}

function userLeavesApp(id) {
    UsersState.setUsers(
        UsersState.users.filter(u => u.id !== id)
    )
}

function getUser(id) {
    return UsersState.users.find(u => u.id === id);
}

function getUsersInRoom(room) {
    return UsersState.users.filter(u => u.room === room);
}

function getAllActiveRooms() {
    return Array.from(
        new Set(UsersState.users.map(u => u.room))
    )
}