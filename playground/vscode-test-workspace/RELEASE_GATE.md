# Release Gate

Ce fichier définit le sens du playground.

Le playground n'est pas une démo.
C'est la feuille de route de couverture fonctionnelle d'Execlens.

## Définition du succès global

Execlens est considéré prêt lorsque :

1. tous les scénarios du playground passent
2. les cas encore incomplets échouent proprement et explicitement
3. aucune simulation ne crashe l'extension
4. aucune simulation ne bloque durablement la webview ou le runtime

## Couverture attendue par étape

### 00 — Basique

- détection de fonction simple
- exécution simple
- entrées/sorties primitives

### 01 à 03 — Entrées

- toutes les formes d'entrées réellement rencontrées par un utilisateur
- des plus simples aux objets runtime les plus difficiles

### 04 à 06 — Logique interne

- branches
- erreurs
- async
- closures
- recursion
- helpers locaux

### 07 à 09 — Particularités du code

- imports locaux
- exports / reexports / default
- classes et méthodes

### 10 à 11 — Sorties

- sorties simples
- sorties spéciales ou difficiles à rendre

### 12 à 13 — Runtime et dépendances externes

- environnement runtime
- timeouts
- dépendances externes directes ou injectées

### 14 à 15 — JavaScript spécifique

- dynamique JS pur
- CommonJS

## Définition d'un scénario réussi

Un scénario est réussi si, pour les fonctions qu'il contient :

1. la fonction visée est correctement détectée
2. les paramètres sont représentés d'une manière exploitable dans le panel
3. l'utilisateur peut exprimer les valeurs utiles sans contournement absurde
4. l'exécution donne le bon résultat ou le bon échec
5. le rendu de sortie reste lisible
6. l'extension reste stable

## Vision produit

Le jour où tout le playground passe, Execlens doit être capable de simuler la majorité des fonctions d'une vraie application, même lorsqu'elles sont complexes, riches en types, liées à leur environnement, ou dépendantes de services externes.

Le scénario `13-ts-external-dependencies.ts` est la base prévue pour la future UX de mocking.
