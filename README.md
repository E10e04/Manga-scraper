# Manga Reader

Application mobile de bibliothèque et de lecture manga. L’interface fonctionne dans un navigateur et peut être emballée en APK Android avec Capacitor.

## Aperçu web

Le serveur local sert l’application et relaie les requêtes des sites compatibles afin de contourner les restrictions CORS du navigateur :

```sh
node server.js
```

Ouvrir ensuite `http://localhost:4173`.

## APK Android de test

Chaque push GitHub et chaque lancement manuel de l’action **Build Android test APK** crée un APK debug installable. Dans GitHub, ouvrir **Actions → Build Android test APK**, sélectionner le run réussi, puis télécharger l’artefact `manga-reader-debug-apk`.

Le build initialise Android avec Capacitor dans le workflow. L’APK utilise le transport HTTP natif Android pour charger les fiches et images; les téléchargements de chapitres sont conservés sur l’appareil pour la lecture hors ligne.
