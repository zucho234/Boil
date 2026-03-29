# Co zrobione
Utworzony środowisko pod apke. Przygotowane 3 foldery pod backend, frontend i db.
Backend i db jest narazie puste. W frontend jest utworzone vite + przygotowałem Dockerfile z .dockerignore. Nie jest on jednak jeszcze w 100% poprawny tak mi się wydaje.

# co musicie zrobic
Sklonujcie sobie repozytorium z git. I trzeba będzie stworzyć do backendu NestJs co utworzy potrzebne podstawowe pliki, później Dockerfile do tej części i Docker-compose który cała apke będzie budował. No i wtedy zacząć pisać kod do naszej funkcjonalności.

# Uruchomienie backendu

W katalogu `/backend` uruchom:

``` bash
npm install
npm run start:dev
```