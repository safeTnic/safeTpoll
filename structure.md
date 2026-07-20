# safeTrail poll tool

## Funktionalitaet

- Im folgenden soll ein Tool zur Erstellung von Umfragen implementiert werden
- Die Umfragen sollen per Click und Auswahl erstellt werden können
- Hierbei soll Auswahl, Textfeld, Multiple Choice, Ranking, Skalen, Matrix etc. möglich sein. Im Prinzip alles klassische.
- Eine Person soll den Poll erstellen können und dann teilen können (per GUID in GET Parameter)
- Es soll für den Ersteller auch eine Ansicht zur Auswertung geben, mit passender Statistik
- Wenn es um Termine geht, soll es die Möglichkeit geben diese direkt in Teams zu übertragen
- Polls sollen sich in Real time aktualisieren für alle User und den Ersteller
- Es soll auch möglich sein einfach Textpassagen einzufügen, sodass man im Prinzip auch Umfragen oder ganze Fragebögen erstellen kann
- Das ganze soll in einer Art Markdown editor möglich sein mit der Option die Poll Komponente einzufügen
- Es soll nur möglich sein auf Polls etc. zuzugreifen solange man eingeloggt ist
- Die Session soll 3 Monate gespeichert werden
- Es soll auch möglich sein Terminierung, Start und Enddatum etc. anzugeben wie lang der Poll läuft
- Dokumentenupload soll auch eine Mögliche Option sein die als Feld ausgewählt werden kann
- Man soll auch die möglichkeit haben eine Custom ID zu vergeben, z.B. statt `tool/<guid>` `tool/meinpoll`
- Die Vorschau soll Live in einem Fenster zu sehen sein während Erstellung
- Login Fenster soll auch vorhanden sein, mit passendem Styling, Registierung soll nicht möglich sein, nur über Django Admin UI
- Anonyme Anzeige, bzw. wie viele bereits abgestimmt haben soll auch einstellbar sein
- Das Tool richtet sich an einfache Abstimmungen bis hin zu komplexen Umfragen für z.B. Feedback oder Fragenkatalog für Mitarbeitergespräche
- Es soll auch Pagination möglich sein um den User nicht zu überfordern
- Der Export der Ergebnisse soll in Excel möglich sein

## Design

- Es soll modernes Tailwind CSS benutzt werden
- Rot soll als Akzentfarbe benutzt werden
- DM Sans soll als primäre Schriftart verwendet werden
- `safetrail_logo.png` liegt bereits im Verzeichnis vor und ist das Logo der Firma
- Das Design soll responsive sein und Design soll per animate einfliegen
- Für Graphen und Diagramme kann eine JS Library verwendet werden, z.B. ChartJS

## Platform

- Die App soll mit Django implementiert werden
- Es soll direkt auf Prod settings gebaut werden, also HTTPS etc.
- Es soll User authentication implementiert werden.
- Jeder Nutzer muss angemeldet sein mit seinem Account
- Jeder Nutzer darf Polls erstellen und ausfüllen, darf aber nur die Auswertung seiner eigenen Polls sehen
- Dazu soll eine Übersichtsseite mit der Liste erstellter Polls existieren, sowie eine Vorschau des Polls und eine Seite zur Auswertung (real time)
- Es soll die gängige Crypto und Cysec implementiert werden, Input validation, Django Auth etc.
