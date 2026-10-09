# Manga Reader

Application mobile de bibliothèque et de lecture manga. L’interface fonctionne dans un navigateur et peut être téléchargé en application mobile ( Voir la page des releases )

## Aperçu web

Le serveur local sert l’application et relaie les requêtes des sites compatibles afin de contourner les restrictions CORS du navigateur :

```sh
node server.js
```

Ouvrir ensuite `http://localhost:4173`.

## APK Android

Chaque push GitHub et chaque lancement manuel de l’action **Build Android test and release APKs** crée deux artefacts : `manga-reader-debug-apk` et `manga-reader-release-apk`. Ouvrir **Actions**, sélectionner le run réussi, puis télécharger l’artefact souhaité.

L’icône Android reprend le carré terracotta avec le caractère 漫 utilisé dans l’interface. Le variant release est signé avec la clé de débogage pour permettre son installation de test; une clé de signature privée est nécessaire pour publier une version destinée au Play Store. Le build initialise Android avec Capacitor dans le workflow. L’APK utilise le transport HTTP natif Android pour charger les fiches et images; les téléchargements de chapitres sont conservés sur l’appareil pour la lecture hors ligne.
