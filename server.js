var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var i;

var MongoClient = require('mongodb').MongoClient;
const uri = "mongodb://localhost:27017,localhost:27018/chat?replicaSet=rs0";
const redis = require("redis");
const client_redis = redis.createClient();

/**
 * Gestion des requêtes HTTP des utilisateurs en leur renvoyant les fichiers du dossier 'public'
 */
app.use('/', express.static(__dirname + '/public'));

/**
 * Liste des utilisateurs connectés
 */
var users = [];

/**
 * Historique des messages
 */
var messages = [];

/**
 * Liste des utilisateurs en train de saisir un message
 */
var typingUsers = [];

io.on('connection', function (socket) {

  /**
   * Utilisateur connecté à la socket
   */
  var loggedUser;

  /**
   * Emission d'un événement "user-login" pour chaque utilisateur connecté
   */
  for (i = 0; i < users.length; i++) {
    socket.emit('user-login', users[i]);
  }

  /**
   * Tentative de visualisation des users connecté via Redis
   /
  // client_redis.keys("", (err, keys) => {
  //   keys.forEach(key => {
  //     console.log(key);
  //     socket.emit('user-login', key);
  //   });
  // });

  /** 
   * Emission d'un événement "chat-message" pour chaque message de l'historique
   */
  for (i = 0; i < messages.length; i++) {
    if (messages[i].username !== undefined) {
      socket.emit('chat-message', messages[i]);
    } else {
      socket.emit('service-message', messages[i]);
    }
  }

  /**
   * Déconnexion d'un utilisateur
   */
  socket.on('disconnect', function () {
    if (loggedUser !== undefined) {
      // Broadcast d'un 'service-message'
      var serviceMessage = {
        text: 'User "' + loggedUser.username + '" disconnected',
        type: 'logout'
      };
      client_redis.del(loggedUser.username);

      socket.broadcast.emit('service-message', serviceMessage);
      // Suppression de la liste des connectés
      var userIndex = users.indexOf(loggedUser);
      if (userIndex !== -1) {
        users.splice(userIndex, 1);
      }
      // Ajout du message à l'historique
      messages.push(serviceMessage);
      // Emission d'un 'user-logout' contenant le user
      io.emit('user-logout', loggedUser);
      // Si jamais il était en train de saisir un texte, on l'enlève de la liste
      var typingUserIndex = typingUsers.indexOf(loggedUser);
      if (typingUserIndex !== -1) {
        typingUsers.splice(typingUserIndex, 1);
      }
    }
  });

  /**
   * Connexion d'un utilisateur via le formulaire :
   */
  socket.on('user-login', function (user, callback) {

    MongoClient.connect(uri, function(connect_err, client) {
      const db = client.db("chat");

      db.collection("users").find({username: user.username}).toArray(function(user_err, usr){
        if (user_err || usr.length == 0){
          db.collection("users").insertOne({username: user.username, inscription: Date.now()}, function(insert_err, insert_user){
            if (insert_err){
              console.log(insert_err);
            }
          })
        }
      });

      db.collection("messages").find({$or: [{sender: user.username}, {receivers: user.username}]}, function(req_err, messages){
        messages.forEach(msg => {
          socket.emit('chat-message', {username: msg.sender, text: msg.message});
        })
      });
    });

    // Vérification que l'utilisateur n'existe pas
    var userIndex = -1;
    for (i = 0; i < users.length; i++) {
      if (users[i].username === user.username) {
        userIndex = i;
      }
    }
    if (user !== undefined && userIndex === -1) { // S'il est bien nouveau
      // Sauvegarde de l'utilisateur et ajout à la liste des connectés
      loggedUser = user;
      client_redis.set(loggedUser.username, Date.now());

      users.push(loggedUser);
      console.log(users);
      // Envoi et sauvegarde des messages de service
      var userServiceMessage = {
        text: 'You logged in as "' + loggedUser.username + '"',
        type: 'login'
      };
      var broadcastedServiceMessage = {
        text: 'User "' + loggedUser.username + '" logged in',
        type: 'login'
      };
      socket.emit('service-message', userServiceMessage);
      socket.broadcast.emit('service-message', broadcastedServiceMessage);
      messages.push(broadcastedServiceMessage);
      // Emission de 'user-login' et appel du callback
      io.emit('user-login', loggedUser);
      callback(true);    } else {
      callback(false);
    }
  });

  /**
   * Réception de l'événement 'chat-message' et réémission vers tous les utilisateurs
   */
  socket.on('chat-message', function (message) {  
    // On ajoute le username au message et on émet l'événement
    message.username = loggedUser.username;
    io.emit('chat-message', message);
    // Sauvegarde du message


    MongoClient.connect(uri, function(connect_err, client) {
      const db = client.db("chat");
      let receivers = [];
      
      users.forEach(usr => {
        if (usr.username != loggedUser.username){
          receivers.push(usr.username);
        }
      })

      db.collection("messages").insertOne({sender: loggedUser.username, receivers: receivers, message: message.text});
    });
    
    messages.push(message);
    if (messages.length > 150) {
      messages.splice(0, 1);
    }
  });

  /**
   * Réception de l'événement 'start-typing'
   * L'utilisateur commence à saisir son message
   */
  socket.on('start-typing', function () {
    // Ajout du user à la liste des utilisateurs en cours de saisie
    if (typingUsers.indexOf(loggedUser) === -1) {
      typingUsers.push(loggedUser);
    }
    io.emit('update-typing', typingUsers);
  });

  /**
   * Réception de l'événement 'stop-typing'
   * L'utilisateur a arrêter de saisir son message
   */
  socket.on('stop-typing', function () {
    var typingUserIndex = typingUsers.indexOf(loggedUser);
    if (typingUserIndex !== -1) {
      typingUsers.splice(typingUserIndex, 1);
    }
    io.emit('update-typing', typingUsers);
  });
});

/**
 * Lancement du serveur en écoutant les connexions arrivant sur le port 3000
 */
http.listen(3000, function () {
  console.log('Server is listening on *:3000');
});