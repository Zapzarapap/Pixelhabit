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

## Daten & Backup

Über **Daten** oben rechts: Backup als JSON exportieren/importieren (auch zum Umziehen auf ein anderes Gerät).
Achtung: Browserdaten löschen löscht auch die Habits.

## Deployment auf GitHub Pages

1. Repo anlegen und `index.html`, `style.css`, `app.js` (und diese README) in den Root pushen.
2. Im Repo: **Settings → Pages → Build and deployment → Source: „Deploy from a branch“**, Branch `main`, Ordner `/ (root)`.
3. Nach ein, zwei Minuten läuft die App unter `https://<user>.github.io/<repo>/`.

Hinweis: Die Daten hängen an der Adresse – lokal geöffnet (`file://`) und auf GitHub Pages sind es getrennte Speicher.
Am iPhone über *Teilen → Zum Home-Bildschirm* wie eine App nutzbar.
