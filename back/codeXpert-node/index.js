const express = require('express');
const cors = require("cors");
const fs = require('fs');
const path = require('path');
const sessions = require('express-session');
var cookieParser = require('cookie-parser');
const app = express();
const PORT = 4000;
const http = require("http");
require("dotenv").config();
const server = http.createServer(app);
const axios = require('axios');
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
var i = 1;
var util = require('util')
var lobbies = [];
var sesiones = [];
// ================= SOCKET ROOMS ================

const socketIO = require("socket.io")(server, {
    cors: {
        origin: true,
        credentials: true,
    },
});


// ================= SAVE TOKEN AS COOKIE ================
app.use(cookieParser());
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Credentials", true);
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, authorization");
    res.header("Access-Control-Allow-Methods", "GET,POST,DELETE,PUT,OPTIONS");
    next();
});
app.use(sessions({
    key: 'session.sid',
    secret: "soy secreto",
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false,
        maxAge: 600000
    },
}));

app.use(express.json());

app.use(cors({
    credentials: true,
    origin: function (origin, callback) {
        console.log(origin);
        return callback(null, true)
    }
}));

app.post("/sendToken", (req, res) => {
    var user = {};
    // ================= FETCH TO BACK WITH AXIOS ================
    let token = req.cookies.token;
});

socketIO.on("connection", (socket) => {
    console.log("CONECTADO");
    var socketId = socket.id;
    const ses = sesiones;

    socket.join("chat-general");
    socketIO.to(`${socketId}`).emit("hello", "Welcome to the general chat");

    // socket.data.name = i;
    // i++;

    socket.on("send token", (data) => {
        let token = data.token;

        axios.post('http://localhost:8000/index.php/getUserInfo', {
            token: token,
        })
            .then(function (response) {
                var user = {
                    token: token,
                    userId: response.data.id,
                    userName: response.data.name,
                }
                sesiones.push(user);

                socket.data.id = response.data.id;
                socket.data.name = response.data.name;

                console.log(socket.data.id);
                console.log(socket.data.name);
            })
            .catch(function (error) {
                console.log(error);
            });
    });

    socket.emit("lobbies list", lobbies);

    socket.on("new lobby", (lobby) => {
        let existeix = false;
        lobbies.forEach((element) => {
            if (element.lobby == lobby) {
                existeix = true;
            }
        });

        if (!existeix) {
            lobbies.push({
                lobby_name: lobby,
                members: [],
                messages: [],
            });
        }

        sendLobbyList();
    });

    socket.on("hello", (m) => {
        sendLobbyList();
    });

    socket.on("join room", (data) => {
        socket.join(data.lobby_name);
        lobbies.forEach((lobby) => {
            if (lobby.lobby_name == data.lobby_name) {
                lobby.members.push({
                    nom: socket.data.name,
                    rank: data.rank,
                });
            }
        });
        console.log(socket.data.name + " joined the lobby -> " + data.lobby_name);
        socketIO.to(data.lobby_name).emit("player joined", socket.data.name);

        sendUserList(data.lobby_name);
        sendMessagesToLobby(data.lobby_name);
    });

    socket.on("chat message", (data) => {
        console.log(data.message);
        console.log(data.room);
        lobbies.forEach((element) => {
            if (element.lobby_name == data.room) {
                element.messages.push(socket.data.name + ": " + data.message);
            }
        });
        sendMessagesToLobby(data.room);
        //
    });

    function sendMessagesToLobby(lobby) {
        lobbies.forEach((element) => {
            if (element.lobby_name == lobby) {
                socketIO.sockets.in(lobby).emit("lobby-message", {
                    messages: element.messages,
                });
            }
        });
    }

    socket.on("leave lobby", (roomName) => {
        lobbies.forEach((lobby, ind_lobby) => {
            if (lobby.lobby_name == roomName) {
                lobby.members.forEach((member, index) => {
                    if (member.nom == socket.data.name) {
                        lobby.members.splice(index, 1);
                    }
                });
            }
            if (lobby.members.length == 0) {
                lobbies.splice(ind_lobby, 1);
            }
        });

        socket.leave(roomName);
        sendUserList(roomName);
        sendLobbyList();
    });

    socket.on("disconnect", () => {
        console.log(socket.data.name + " disconnected");
    });
});

async function sendLobbyList() {
    await socketIO.emit("lobbies list", lobbies);
}

async function sendUserList(room) {
    var list = [];

    const sockets = await socketIO.in(room).fetchSockets();

    sockets.forEach((element) => {
        console.log(socketIO.sockets.sockets.get(element.id).data.name);
        list.push(socketIO.sockets.sockets.get(element.id).data.name);
    });

    socketIO.to(room).emit("lobby user list", {
        list: list,
        message: "lista en teoria",
    });
}

// ==================== MY SQL ===================

var mysql = require("mysql");

var con = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_DATABASE,
});

con.connect(function (err) {
    if (err != null) {
        console.log(err);
    } else {
        console.log("Connected to database!");
    }
});

app.get("/getUsers", (req, res) => {
    con.query("SELECT * FROM users", function (err, result, fields) {
        var ret = {
            result: result,
        };

        res.send(JSON.stringify(ret));
    });
});

// ================ LISTEN SERVER ================

server.listen(PORT, () => {
    console.log("Listening on *:" + PORT);
});