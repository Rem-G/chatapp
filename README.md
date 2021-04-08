# Chatapp

## Mise en route

### Lancement serveurs MongoDB
*Sous réserve d'avoir créé une base MongoDB et son replicaSet*

    ./bin/mongod --port 27017 --dbpath data_chat --replSet rs0

    ./bin/mongod --port 27018 --dbpath data_chat_rs1 --replSet rs0

### Lancement serveur redis

    redis-server

### Lancement application

    node server.js

## Source
[https://blog.bini.io/developper-une-application-avec-socket-io/](https://blog.bini.io/developper-une-application-avec-socket-io/)

## Contributeurs
- Thomas Cenci
- Rémi Gosselin
