# Execlens Playgrounds

Les playgrounds de code sont organises par langage. Ils ne doivent pas dependre d'un IDE.

```txt
playground/
  languages/
    <language-id>/
      src/
      tsconfig.json
      README.md
      RELEASE_GATE.md
```

Le playground TS/JS commun est :

```txt
playground/languages/tsjs
```

Il sert de matrice fonctionnelle pour l'adapter langage TS/JS et le runtime Node.

Quand un nouveau langage est ajoute, creer un nouveau playground au meme format, par exemple :

```txt
playground/languages/python
playground/languages/rust
```

Les tests automatises purs langage/runtime doivent mirrorer ce chemin sous `test/playground/languages/`.

Les tests specifiques a un IDE doivent rester sous `test/playground/ide/<ide-id>/languages/<language-id>/` et reutiliser les playgrounds communs.
