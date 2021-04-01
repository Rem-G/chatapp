# Projet chat app

## Consignes
Réalisation d'un serveur de chat :
- Connaître quels sont les utilisateurs connectés et les afficher (Redis)
- Stocker l'ensemble des messages (MongoDB)
- Utiliser le ReplicaSet pour permettre une meilleure tolérance aux pannes
- Pouvoir afficher une conversation précédente entre deux utilisateurs
- Sortir des requêtes pertinentes : utilisateur le plus sollicité, celui qui communique le plus, etc.

## Contributors
- GOSSELIN Rémi
- CENCI Thomas

## Utilisation


Serveur :
1. Run mongodb
2. Run redis server
3. `node server.js`

## TO DO
- Récupération des users avec Redis
- Analyses
- Replicaset

## DONE
- Gestion des users
- Gestion des messages

Code source : https://github.com/Applelo/Socket.io-Room-Chat
