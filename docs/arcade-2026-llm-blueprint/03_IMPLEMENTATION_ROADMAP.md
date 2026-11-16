# 🚀 VICE CITY 26 — FEUILLE DE ROUTE D'IMPLÉMENTATION (ARCADE 2026 + LLM)

Ce document découpe la mise en œuvre concrète des mécaniques dans l'architecture existante de **VICE CITY 26** (`js/game.js`, `js/entities.js`, `js/net.js`, `js/missions.js`, `server/world_server.js`).

---

## Phase 1 : "Instant Dopamine" & Moteur de Combo Arcade (Client `js/game.js` & `js/entities.js`)
- [ ] **Jauge de Combo & Multiplicateur d'Adrénaline sous tension (`comboTimer` de 6 secondes)** :
  - Barre néon dynamique sous le score qui se recharge à chaque action risquée et fait monter le multiplicateur (`×1` → `×10`).
- [ ] **Détecteur de "Near-Miss" & Contresens à haute vitesse** :
  - Frôler une voiture de trafic à moins de `14px` à pleine vitesse déclenche un flash `⚡ NEAR MISS! +$150`, un son synthé arcade et +2.5s sur le timer de combo.
- [ ] **Bonus "Clean Getaway" (Cash-Out d'évasion)** :
  - Plus le joueur survit longtemps à 3★–5★, plus une cagnotte de fuite (`getawayPot`) gonfle. Semer la police ou atteindre un *Pay 'n' Spray* encaisse toute la cagnotte d'un coup.

---

## Phase 2 : Événements Flash & Primes Multijoueurs sur le Serveur Persistant (`server/world_server.js` & `js/net.js`)
- [ ] **Système de Prime Serveur en Direct (`SERVER_BOUNTY`)** :
  - Lorsqu'un joueur dépasse un seuil de chaos (ou sur décision du Game Master), sa tête est mise à prix avec une icône crâne néon sur la mini-carte de tous les joueurs connectés.
- [ ] **Événements Flash Synchronisés (90 secondes)** :
  - *Hot Drop Crate* : largage d'une caisse d'or/armes lourdes annoncé par Pager à tous les joueurs de la room.
  - *Convoi Blindé Prioritaire* : un fourgon *Grupo Seguro* escorté traverse un axe routier majeur ; ses sacs de billets sont partagés/disputés en temps réel.

---

## Phase 3 : Contrôle Visuel des Quartiers & Rachat de Commerces (`js/game.js` & `server/world_server.js`)
- [ ] **Acquisition de Commerces Rétro (*Malibu Club*, *Hotel Dixon*, *Sunshine Autos*, *Vice Port Warehouse*)** :
  - Possibilité d'acheter un commerce avec son cash, affichant le nom du propriétaire au-dessus de l'enseigne pour tous les joueurs du serveur et versant des revenus périodiques.
- [ ] **Gardes de Faction & Défense de Territoire** :
  - Les gardes du commerce protègent le propriétaire et attaquent les rivaux qui tentent de braquer la caisse.

---

## Phase 4 : Cerveau LLM "ViceNet AI Director" & Factions à Mémoire (`server/world_server.js` & `js/missions.js`)
- [ ] **Module `ViceNetDirector` dans `server/world_server.js`** :
  - Collecte le `WorldDigest` (actions récentes, joueurs, quartiers chauds) et interroge un endpoint LLM léger (avec fallback procédural instantané) pour générer :
    1. Les **Flashs Info Radio** personnalisés avec les vrais pseudos des joueurs.
    2. Les **SMS / Pagers des Boss de Factions** (rancunes suite aux vols de voitures ou fusillades dans leur quartier).
    3. Les **Contrats Dynamiques de 90s** aux cabines téléphoniques (`PAYPHONE_BOOTH`).
