# Pixel Habits

Simpler Habit-Tracker im Pixel-Stil – reines HTML/CSS/JS, keine Abhängigkeiten, kein Build-Schritt.
Alle Daten bleiben lokal im Browser (`localStorage`).

## Seiten

- **Tracker** – Wochenraster Mo–So, Habits untereinander. Jedes Habit hat ein Ziel (1–6× pro Woche oder täglich).
  Verpasste Tage bei täglichen Habits und verfehlte Wochenziele werden rot markiert. Wochen per Pfeil, Wischen,
  Pfeiltasten oder über die KW-Leiste wechseln. Vergangene Tage lassen sich nachtragen.
- **Zähler** – Karten antippen = +1, mit −1 korrigieren. Pro Zähler wählbar, ob die große Zahl Heute / Woche / Gesamt zeigt.
- **Statistik** – Übersicht über alle Habits & Zähler sowie Detailseiten mit Quote, Serien, Wochen-Verlauf,
  Kalender-Heatmap und Wochentags-Auswertung.

## Pausieren

Im Bearbeiten-Dialog eines Habits (Namen antippen) lässt es sich ab einem Datum pausieren – z. B. bei Verletzung.
Pausierte Tage zählen weder als verpasst noch in die Quote, die Serie bleibt erhalten. Angebrochene Wochen
werden anteilig bewertet (4×/Woche bei 3 aktiven Tagen → Ziel 2).

## Als App installieren / offline

Die Seite ist eine installierbare Web-App mit eigenem Icon und funktioniert nach dem ersten Laden auch offline.
iPhone: Safari → *Teilen → Zum Home-Bildschirm*. Das schützt auch die Daten: Safari löscht Speicher von
Webseiten, die man länger nicht besucht hat – bei Apps auf dem Home-Bildschirm nicht.

## Daten & Backup

Über **Daten** oben rechts: Backup als JSON exportieren/importieren (auch zum Umziehen auf ein anderes Gerät).
Achtung: Browserdaten löschen löscht auch die Habits.

## Deployment auf GitHub Pages

1. Alle Dateien (inkl. `sw.js`, `manifest.webmanifest`, `icons/`) in den Root des Repos pushen.
2. Im Repo: **Settings → Pages → Build and deployment → Source: „Deploy from a branch“**, Branch `main`, Ordner `/ (root)`.
3. Nach ein, zwei Minuten läuft die App unter `https://<user>.github.io/<repo>/`.

Hinweis: Die Daten hängen an der Adresse – lokal geöffnet (`file://`) und auf GitHub Pages sind es getrennte Speicher.
