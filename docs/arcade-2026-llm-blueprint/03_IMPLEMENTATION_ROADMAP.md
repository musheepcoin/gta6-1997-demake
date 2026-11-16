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

## Phase 3 (Futur) : Système Complexe de Syndicats / Contrôle de Territoire Multijoueur
- [ ] **Architecture Multijoueur dédiée (à concevoir séparément)** :
  - Pas de rachat simple des monuments publics iconiques ; nécessite un vrai système multijoueur compétitif (influence de quartier dynamique, planques instanciées ou guerre de syndicats persistante sur le serveur).

---

## Phase 4 : Cerveau LLM "ViceNet AI Director" & Factions à Mémoire (`server/world_server.js` & `js/missions.js`)
- [ ] **Module `ViceNetDirector` dans `server/world_server.js`** :
  - Collecte le `WorldDigest` (actions récentes, joueurs, quartiers chauds) et interroge un endpoint LLM léger (avec fallback procédural instantané) pour générer :
    1. Les **Flashs Info Radio** personnalisés avec les vrais pseudos des joueurs.
    2. Les **SMS / Pagers des Boss de Factions** (rancunes suite aux vols de voitures ou fusillades dans leur quartier).
    3. Les **Contrats Dynamiques de 90s** aux cabines téléphoniques (`PAYPHONE_BOOTH`).
