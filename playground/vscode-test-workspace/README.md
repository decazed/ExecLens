# Execlens Playground

Ce workspace est la matrice de couverture manuelle d'Execlens.

L'objectif de cette version du playground est précis :

- partir de zéro
- progresser volontairement du plus simple au plus complexe
- couvrir un maximum de cas réels qu'un utilisateur pourra rencontrer
- faire du playground la référence produit

La cible finale est la suivante :

- un utilisateur clique sur n'importe quelle fonction ou presque
- Execlens détecte correctement la cible
- le panel sait représenter les entrées de manière exploitable
- la simulation sait gérer la logique interne réelle
- les sorties sont rendues lisiblement
- les dépendances externes peuvent être simulées, puis mockées proprement

## Progression voulue

### Phase 1: basique

1. `src/00-ts-basics.ts`

### Phase 2: entrées

2. `src/01-ts-input-primitives.ts`
3. `src/02-ts-input-structures.ts`
4. `src/03-ts-input-runtime-values.ts`

### Phase 3: logique interne

5. `src/04-ts-internal-control-flow.ts`
6. `src/05-ts-internal-errors-and-async.ts`
7. `src/06-ts-internal-state-and-closures.ts`

### Phase 4: particularités du code

8. `src/07-ts-imports-and-local-modules.ts`
9. `src/08-ts-exports-reexports-and-classes.ts`
10. `src/09-ts-reexport-entry.ts`

### Phase 5: sorties

11. `src/10-ts-output-common.ts`
12. `src/11-ts-output-special.ts`

### Phase 6: runtime et dépendances externes

13. `src/12-ts-runtime-and-timeouts.ts`
14. `src/13-ts-external-dependencies.ts`

### Phase 7: JavaScript spécifique

15. `src/14-js-specific-runtime.js`
16. `src/15-js-commonjs-and-interop.cjs`

## Ce que cette suite couvre

### Basique

- fonctions top-level exportées
- paramètres primitifs
- retours primitifs

### Entrées

- `string`, `number`, `boolean`, `null`, `undefined`, `bigint`
- unions de littéraux, enums, types brandés
- tableaux, tuples, records
- objets imbriqués
- callbacks
- `Promise<T>` en entrée
- objets runtime comme `Date`, `URL`, `RegExp`, `Error`, `Map`, `Set`, `Buffer`

### Logique interne

- branches
- boucles
- guards
- helpers locaux
- closures
- recursion
- erreurs synchrones et asynchrones
- délais et agrégation asynchrone

### Particularités de structure de code

- imports locaux
- graphes de modules
- exports directs
- exports aliasés
- export default
- réexports
- classes, méthodes d'instance et méthodes statiques

### Sorties

- sorties primitives
- objets, tableaux, `null`
- `bigint`, `Date`, `Map`, `Set`, `Error`
- champs optionnels / `undefined`

### Runtime et externe

- `Date.now`, `Math.random`, `process.env`, `process.cwd`
- timeouts
- promesses non résolues
- boucles infinies
- accès disque
- clients HTTP
- repository BDD-like
- cache
- queue / publisher
- logger

### JavaScript spécifique

- signatures dynamiques
- objets sans types TS
- mutation libre
- CommonJS

## Comment utiliser le playground

Pour chaque fichier :

1. ouvrez le fichier
2. placez le curseur dans la fonction ciblée
3. lancez le simulateur
4. vérifiez :
   - détection de la bonne fonction
   - représentation correcte des entrées
   - exécution correcte
   - rendu de sortie correct
   - stabilité de l'extension

## Principe de lecture

Chaque fichier correspond à une famille de difficultés.

Vous ne devez pas seulement vérifier que "ça marche" sur un exemple.
Vous devez vérifier que le panel et le runtime deviennent réellement capables de gérer cette famille de cas.

Quand toute cette suite passe proprement, Execlens devient crédible sur la majorité des fonctions réelles d'une codebase.
