# 🚀 VICE CITY 26 — FEUILLE DE ROUTE D'IMPLÉMENTATION (ARCADE 2026 + LLM)

Ce document découpe la mise en œuvre concrète des mécaniques dans l'architecture existante de **VICE CITY 26** (`js/game.js`, `js/entities.js`, `js/net.js`, `js/missions.js`, `server/world_server.js`).

---

## Phase 1 : "Instant Dopamine" & Moteur de Combo Arcade (Client `js/game.js` & `js/entities.js`) — ✅ TERMINÉ (`v101_166`)
- [x] **Jauge de Combo & Multiplicateur d'Adrénaline sous tension (`comboTimer` de 6 secondes)** :
  - Barre néon dynamique sous le score qui se recharge à chaque action risquée et fait monter le multiplicateur (`×1` → `×10`) + bonus `+1` multiplicateur permanent dès 15 hits d'affilée.
- [x] **Détecteur de "Near-Miss", Contresens & Drift à haute vitesse** :
  - Frôler une voiture de trafic ou de police à pleine vitesse déclenche un flash `⚡ NEAR MISS! +$150..$300`, un son synthé ascendant et recharge le timer de combo.
- [x] **Bonus "Clean Getaway" (Cash-Out d'évasion)** :
  - Plus le joueur survit longtemps à 1★–6★, plus une cagnotte de fuite (`wantedGetawayPot`) gonfle. Semer la police ou atteindre un *Pay 'n' Spray* encaisse toute la cagnotte d'un coup.

---

## Phase 2 : Événements Flash & Primes Multijoueurs sur le Serveur Persistant (`server/world_server.js` & `js/net.js`) — ✅ TERMINÉ (`v101_166`)
- [x] **Système de Prime Serveur en Direct (`BOUNTY_START` / `activeServerBounty`)** :
  - Lorsqu'un joueur dépasse 4★ ou 14 hits de combo, sa tête est mise à prix pendant 60s pour tous les joueurs connectés (avec bonus de survie s'il tient 60s).
- [x] **Événements Flash Synchronisés (90 secondes)** :
  - *Spec-Ops Hot Drop Crate* : largage d'une caisse d'or (`+$15,000..$30,000`), multiplicateur `+1` et arme lourde annoncé par Pager et synchronisé en ligne.

---

## Phase 3 : Guerre de Quartiers Multijoueur "King of the District / Live Turf War" (`js/game.js`, `js/renderer.js`, `js/net.js`) — ✅ TERMINÉ (`v101_169`)
- [x] **Domination Dynamique des 8 Grands Quartiers (`turfZones`) sans blocage des monuments** :
  - Chaque action de score/combo fait grimper l'influence du joueur dans le quartier actuel (`addTurfInfluence`).
  - Dépasser le leader actuel déclenche un `👑 TURF TAKEOVER` diffusé à tout le serveur, affiche `👑 CROWNED TURF OF <PSEUDO>` à l'entrée du quartier et sur la carte `[M]`, octroie `+25 %` de bonus cash dans le quartier et pacifie le gang local !

---

## Phase 4 : Cerveau IA "ViceNet 5G Director", Agents Chat (`@fixer`, `@diaz`, `@radio`), Contrats Dynamiques & Factions (`js/missions.js`, `js/game.js`, `js/net.js`) — ✅ TERMINÉ (`v101_169`)
- [x] **Contrats "Fixer IA" Dynamiques de 90s sur le Smartphone (`⚡ FIXER: LIVE 90S` dans `js/missions.js`)** :
  - Scanne les vrais véhicules et quartiers autour du joueur pour générer à la volée 4 archétypes de contrats 90s (*Live Boost & Chop*, *Cartel Courier Ram & Extort*, *60 MPH Nitro Speed Run*, *Syndicate VIP Hit*).
- [x] **Mémoire Rancunière des 5 Factions ("2.5D Nemesis System" dans `js/game.js`)** :
  - *Don Diaz (Star Cartel)*, *Toussaint (Zoe Pound)*, *Sonny (Ocean Syndicate)*, *Big Mitch (Brotherhood)* et *Capt. Cortez (VCPD SWAT)* traquent les vols et destructions dans leur quartier, envoient des DM menaçants personnalisés sur le Smartphone et dépêchent une escouade de représailles (`+$15,000` si éliminée).
- [x] **Flashs Info Radio (`🎙️ FLASH FM // BREAKING NEWS`)** :
  - Commentaires en direct sur le Smartphone réagissant aux actions du joueur dans son quartier actuel.
