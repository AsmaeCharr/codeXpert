const express = require("express");
const cors = require("cors");
const sessions = require("express-session");
var cookieParser = require("cookie-parser");
const app = express();
const PORT = 4000;
const http = require("http");
require("dotenv").config();
const server = http.createServer(app);
const axios = require("axios");

const maxMembersOnLobby = 4;
const laravelRoute = "http://127.0.0.1:8000/index.php/";

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
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, authorization"
  );
  res.header("Access-Control-Allow-Methods", "GET,POST,DELETE,PUT,OPTIONS");
  next();
});
app.use(
  sessions({
    key: "session.sid",
    secret: "soy secreto",
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: false,
      maxAge: 600000,
    },
  })
);

app.use(express.json());

app.use(
  cors({
    credentials: true,
    origin: function (origin, callback) {
      console.log(origin);
      return callback(null, true);
    },
  })
);

// app.post("/sendToken", (req, res) => {
//   var user = {};
//   // ================= FETCH TO BACK WITH AXIOS ================
//   let token = req.cookies.token;
// });

socketIO.on("connection", (socket) => {
  console.log("CONECTADO");
  var socketId = socket.id;
  socket.data.current_lobby = null;
  // const ses = sesiones;

  socket.join("chat-general");
  socketIO.to(`${socketId}`).emit("hello", "Welcome to the general chat");

  // socket.data.name = i;
  // i++;

  socket.on("send token", (data) => {
    let token = data.token;

    axios
      .post(laravelRoute + "getUserInfo", {
        token: token,
      })
      .then(function (response) {
        var user = {
          token: token,
          userId: response.data.id,
          userName: response.data.name,
        };
        // console.log(user);
        sesiones.push(user);

        socket.data.userId = response.data.id;
        socket.data.name = response.data.name;
        socket.data.avatar = response.data.avatar;
        socket.data.hearts_remaining = -1
        socket.data.question_at = -1
      })
      .catch(function (error) {
        console.log(error);
      });
  });

  socket.on("hello", (m) => {
    if (socket.data.current_lobby != null) {
      socket.emit("YOU_ARE_ON_LOBBY", {
        lobby_name: socket.data.current_lobby
      })
      // socket.join(socket.data.current_lobby)
    } else {
      sendLobbyList();
    }


  });

  sendLobbyList();

  socket.on("lobby_data_pls", () => {
    sendUserList(socket.data.current_lobby);
    sendMessagesToLobby(socket.data.current_lobby);
  })

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
  });

  socket.on("join room", (data) => {
    lobbies.forEach((lobby) => {
      if (lobby.lobby_name == data.lobby_name) {
        if (lobby.members.length == maxMembersOnLobby) {
          socketIO.to(`${socketId}`).emit("LOBBY_FULL_ERROR", {
            message: "The selected lobby is full",
          });
        } else {
          var disponible = true;

          lobby.members.forEach(member => {
            if (member.nom == socket.data.name) {
              disponible = false;
            }
          });

          if (disponible) {
            lobby.members.push({
              nom: socket.data.name,
              rank: data.rank,
              idUser: socket.data.userId,
            });
          }
        }
      }
    });
    socket.join(data.lobby_name);
    socket.data.current_lobby = data.lobby_name;
    console.log(socket.data.name + " joined the lobby -> " + data.lobby_name);
    addMessage({
      nickname: "ingame_events",
      message: `${socket.data.name} joined the lobby.`,
      avatar: socket.data.avatar
    }, socket.data.current_lobby)

    sendUserList(data.lobby_name);
    sendMessagesToLobby(data.lobby_name);
    sendLobbyList();
  });

  socket.on("leave lobby", (roomName) => {
    leaveLobby(socket);
    sendUserList(roomName);
    sendLobbyList();
  });

  socket.on("chat message", (data) => {
    addMessage({
      nickname: socket.data.name,
      message: data.message,
      avatar: socket.data.avatar
    }, data.room);
  });

  socket.on("start_game", () => {
    lobbies.forEach((lobby) => {
      // console.log(socket.data.lobby_name);
      if (lobby.lobby_name == socket.data.current_lobby) {
        socketIO.to(lobby.lobby_name).emit("game_started");
        startGame(lobby.lobby_name);
      }
    });
  });

  socket.on("check_answer", (data) => {
    /*
    console.log(
      "idQuestion: " + socket.data.idQuestion,
      "idGame: " + socket.data.game_data.idGame,
      "idUser: " + socket.data.userId,
      "evalRes: " + data.resultsEval,
      "evalPassed: " + data.evalPassed
    );
    */
    axios
      .post(laravelRoute + "checkAnswer", {
        idQuestion: socket.data.idQuestion,
        idGame: socket.data.game_data.idGame,
        idUser: socket.data.userId,
        evalRes: data.resultsEval,
        evalPassed: data.evalPassed,
      })
      .then(function (response) {
        console.log(response);
        var user_game = response.data.user_game;
        var game = response.data.game;
        if (response.data.correct) {
          // socket.to(socket.data.current_lobby).emit("answered_correctly", {
          //   message: `${socket.data.name} answered question ${user_game.question_at} correctly.`,
          // });

          addMessage({
            nickname: "ingame_events",
            message: `${socket.data.name} answered question ${user_game.question_at} correctly.`,
            avatar: socket.data.avatar
          }, socket.data.current_lobby)

          socket.data.question_at = user_game.question_at;
          lobbies.forEach((lobby) => {
            // console.log(socket.data.lobby_name);
            if (lobby.lobby_name == socket.data.current_lobby) {
              socket.data.idQuestion = lobby.game_data.questions[socket.data.question_at].id;
            }
          });

          // socket.data.idQuestion = game.questions[user_game.question_at];
          sendUserList(socket.data.current_lobby)
          // console.log(socket.data);
          // Only passes if not dead
          if (user_game.finished) {
            // Finish but still don't know if they won
            if (game.winner_id != undefined) {
              setWinnerId(socket.data.userId);
              // console.log(lobbies);

              updateUserLvl(socket.data.current_lobby)
              socketIO.to(socket.data.current_lobby).emit("game_over", {
                message: `${socket.data.name} won the game`,
              });

              // AXIOS to updateUserLvl LO MISMO QUE EN SETUSERGAME
              socketIO.to(socket.id).emit("user_finished", {
                message: `YOU WON`,
                stats: {
                  hearts_remaining: user_game.hearts_remaining,
                  perks_used: user_game.perks_used,
                  question_at: socket.data.question_at,
                },
              });
            } else {
              // FUTURO uwu
            }
          } else {
            sendQuestionDataToUser(
              socket.id,
              socket.data.question_at,
              socket.data.current_lobby
            );
          }
        } else {
          // socket.to(socket.data.current_lobby).emit("answered_wrong", {
          //   message: `${socket.data.name} answered question ${user_game.question_at + 1} wrong.`,
          // });

          addMessage({
            nickname: "ingame_events",
            message: `${socket.data.name} answered question ${user_game.question_at + 1} wrong.`,
            avatar: socket.data.avatar
          }, socket.data.current_lobby)

          socket.data.hearts_remaining--
          sendUserList(socket.data.current_lobby)

          if (user_game.dead) {
            // socket.to(socket.data.current_lobby).emit("other_lost", {
            //   message: `${socket.data.name} has lost!`,
            // });

            addMessage({
              nickname: "ingame_events",
              message: `${socket.data.name} has lost!`,
              avatar: socket.data.avatar
            }, socket.data.current_lobby)

            socketIO.to(socket.id).emit("user_finished", {
              message: `YOU LOST`,
              stats: {
                hearts_remaining: user_game.hearts_remaining,
                perks_used: user_game.perks_used,
                question_at: user_game.question_at,
              },
            });
          }
        }
        // console.log(response.data);
      })
      .catch(function (error) {
        console.log(error);
      });
  });

  socket.on("disconnect", () => {
    console.log(socket.data.name + " disconnected");
    leaveLobby(socket);
  });
});

function addMessage(msgData, room) {
  lobbies.forEach((lobby) => {
    if (lobby.lobby_name == room) {
      lobby.messages.push(msgData);
    }
  });
  sendMessagesToLobby(room);
}

// async function usuariDisponible(socketId, room) {
//   let disponible = true
//   const sockets = await socketIO.in(room).fetchSockets();

//   sockets.forEach((element) => {
//     if (element.id == socketId) {
//       disponible = false;
//     }
//   });

//   return disponible;
// }

async function startGame(room) {
  await axios
    .get(laravelRoute + "startGame")
    .then(function (response) {
      // console.log(response.data);
      // console.log(response);
      lobbies.forEach((lobby) => {
        if (lobby.lobby_name == room) {
          lobby.game_data = response.data;

          // console.log(room);
          setGameData(response.data, room);

          socketIO.to(room).emit("game_started");
          // console.log(lobby.game_data);
          socketIO.to(room).emit("lobby_name", {
            lobby: room
          });
          socketIO.sockets.in(room).emit("lobby-message", {
            messages: lobby.messages,
          });
          sendUserList(room)
          socketIO.to(room).emit("question_data", {
            statement: lobby.game_data.questions[0].statement,
            inputs: lobby.game_data.questions[0].inputs,
            output: lobby.game_data.questions[0].outputs[0],
          });
          enviarDadesGame(room);
        }
      });
    })
    .catch(function (error) {
      console.log(error);
    });
}

async function enviarDadesGame(room) {
  var members;
  var idGame;

  lobbies.forEach((lobby) => {
    if (lobby.lobby_name == room) {
      members = lobby.members;
      idGame = lobby.game_data.idGame;
      console.log(members);
    }
  });
  await axios
    .post(laravelRoute + "setUserGame", {
      users: members,
      idGame: idGame,
    })
    .then(function (response) {
      // console.log(response);
    })
    .catch(function (error) {
      console.log(error);
    });

  // const dades = new FormData();
  // dades.append("name", dadesname);
}

async function updateUserLvl(room) {
  var members;
  var idGame;

  lobbies.forEach((lobby) => {
    if (lobby.lobby_name == room) {
      members = lobby.members;
      idGame = lobby.game_data.idGame;
    }
  });
  await axios
    .post(laravelRoute + "updateUserLvl", {
      users: members,
      idGame: idGame,
    })
    .then(function (response) {
      // console.log(response.data);
      setUserLvl(response.data, room)
      sendUserStats(room)
    })
    .catch(function (error) {
      console.log(error);
    });

  // const dades = new FormData();
  // dades.append("name", dadesname);
}

async function sendUserStats(room) {
  const sockets = await socketIO.in(room).fetchSockets();

  lobbies.forEach(lobby => {
    if (lobby.lobby_name == room) {
      lobby.members.forEach(member => {
        sockets.forEach((element) => {
          if (socketIO.sockets.sockets.get(element.id).data.userId == member.idUser) {
            socketIO.to(element.id).emit("stats", member)
          }
        });
      });
    }
  });
}

function setUserLvl(data, room) {

  lobbies.forEach((lobby) => {

    if (lobby.lobby_name == room) {
      data.forEach(statUser => {
        lobby.members.forEach(member => {
          if (statUser.idUser == member.idUser) {
            member.xpEarned = statUser.xpEarned
            member.coinsEarned = statUser.coinsEarned
            member.eloEarned = statUser.eloEarned
          }
        });
      });
    }
  });

}

async function setGameData(game_data, room) {
  const sockets = await socketIO.in(room).fetchSockets();

  sockets.forEach((element) => {
    socketIO.sockets.sockets.get(element.id).data.game_data = game_data;
    socketIO.sockets.sockets.get(element.id).data.idQuestion =
      game_data.questions[0].id;
    socketIO.sockets.sockets.get(element.id).data.question_at = 0;
    socketIO.sockets.sockets.get(element.id).data.hearts_remaining = 3;
    socketIO.sockets.sockets.get(element.id).data.idGame = game_data.idGame;
  });
}

function sendQuestionDataToUser(socketId, questionIndex, currentLobby) {
  lobbies.forEach((lobby) => {
    if (lobby.lobby_name == currentLobby) {
      socketIO.to(socketId).emit("question_data", {
        statement: lobby.game_data.questions[questionIndex].statement,
        inputs: lobby.game_data.questions[questionIndex].inputs,
        output: lobby.game_data.questions[questionIndex].outputs[0],
      });
    }
  });
}

function setWinnerId(winnerId, currentLobby) {
  lobbies.forEach((lobby) => {
    if (lobby.lobby_name == currentLobby) {
      lobby.game_data.winner = winnerId;
    }
  });
}

async function leaveLobby(socket) {
  lobbies.forEach((lobby, ind_lobby) => {
    if (lobby.lobby_name == socket.data.current_lobby) {
      lobby.members.forEach((member, index) => {
        if (member.nom == socket.data.name) {
          lobby.members.splice(index, 1);
          addMessage({
            nickname: "ingame_events",
            message: `${socket.data.name} left the lobby.`,
            avatar: socket.data.avatar
          }, socket.data.current_lobby)
        }
      });
    }
    if (lobby.members.length == 0) {
      lobbies.splice(ind_lobby, 1);
    }
  });

  socket.leave(socket.data.current_lobby);
  socket.data.current_lobby = null
  socketIO.to(socket.id).emit("YOU_LEFT_LOBBY")
  sendLobbyList();
}

function sendMessagesToLobby(lobby) {
  lobbies.forEach((element) => {
    if (element.lobby_name == lobby) {
      socketIO.sockets.in(lobby).emit("lobby-message", {
        messages: element.messages,
      });
    }
  });
}

async function sendLobbyList() {
  await socketIO.emit("lobbies list", lobbies);
}

async function sendUserList(room) {
  var list = [];

  const sockets = await socketIO.in(room).fetchSockets();

  sockets.forEach((element) => {
    // console.log(socketIO.sockets.sockets.get(element.id).data.name);
    list.push({
      name: socketIO.sockets.sockets.get(element.id).data.name,
      avatar: socketIO.sockets.sockets.get(element.id).data.avatar,
      hearts_remaining: socketIO.sockets.sockets.get(element.id).data.hearts_remaining,
      question_at: socketIO.sockets.sockets.get(element.id).data.question_at
    });
  });

  socketIO.to(room).emit("lobby user list", {
    list: list,
    message: "user list",
  });
}

// ==================== MY SQL ===================

// var mysql = require("mysql");

// var con = mysql.createConnection({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASS,
//   database: process.env.DB_DATABASE,
// });

// con.connect(function (err) {
//   if (err != null) {
//     console.log(err);
//   } else {
//     console.log("Connected to database!");
//   }
// });

// ================ LISTEN SERVER ================

server.listen(PORT, () => {
  console.log("Listening on *:" + PORT);
});
