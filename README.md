# Manga Reader

Application mobile de bibliothèque et de lecture manga. L’interface fonctionne dans un navigateur et peut être téléchargé en application mobile ( Voir la page des releases )

## Aperçu web

Le serveur local sert l’application et relaie les requêtes des sites compatibles afin de contourner les restrictions CORS du navigateur :

```sh
node server.js
```

Ouvrir ensuite `http://localhost:4173`.

## APK Android

Chaque push GitHub et chaque lancement manuel de l’action **Build Android release APK** crée l’artefact `manga-reader-release-apk`. Ouvrir **Actions**, sélectionner le run réussi, puis le télécharger.

L’icône Android reprend le carré terracotta avec le caractère 漫 utilisé dans l’interface. Le build initialise Android avec Capacitor dans le workflow. L’APK utilise le transport HTTP natif Android pour charger les fiches et images; les téléchargements de chapitres sont conservés sur l’appareil pour la lecture hors ligne.
# Publication Android

Le workflow produit un unique APK release. Les tags `vX.Y.Z` publient `manga-reader.apk` dans une GitHub Release; l’application vérifie la dernière release au démarrage et propose son téléchargement.

Pour les mises à jour installables par-dessus la version précédente, configurer les secrets GitHub `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` et `ANDROID_KEY_PASSWORD` avec une clé release stable, et réutiliser cette même clé à chaque version. Si ces secrets sont absents, le workflow publie tout de même l’APK avec la clé debug temporaire de CI; Android peut alors refuser l’installation par-dessus une version signée autrement. La clé release ne doit pas être renouvelée ni perdue.
