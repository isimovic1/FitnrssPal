# FitnessPal

Mobilna aplikacija za praćenje kalorija, težine i napretka (u stilu MyFitnessPala), napravljena u
[Expo](https://expo.dev) / React Nativeu — radi na Androidu i iOS-u (i u browseru za testiranje).

## Mogućnosti

- **Dnevnik prehrane** — doručak, ručak, večera, međuobroci; unos u gramima ili porcijama, uređivanje i brisanje.
- **Skeniranje bar-koda / QR koda** — kamera prepoznaje EAN-13/EAN-8/UPC kodove (i QR kodove koji sadrže
  bar-kod ili Open Food Facts link) i povlači kalorije i nutritivne vrijednosti iz
  [Open Food Facts](https://world.openfoodfacts.org) baze. Ako proizvoda nema, uneseš ga s etikete
  i sljedeći put se prepoznaje odmah (i bez interneta).
- **Pretraga namirnica** — ugrađena lista čestih namirnica, tvoje nedavne/spremljene namirnice i online pretraga.
- **Kalorijski cilj i deficit** — BMR (Mifflin-St Jeor), TDEE prema razini aktivnosti, dnevni cilj prema
  tjednom cilju (npr. −0,5 kg/tjedan ≈ −550 kcal/dan), dnevni deficit/suficit uključujući vježbu.
- **Makronutrijenti** — proteini, UH, masti s ciljevima u gramima; plus vlakna, šećeri, zasićene masti, sol.
- **Dodatne dnevne vrijednosti** — voda, koraci, vježba (procjena kalorija po MET vrijednostima), težina,
  opseg struka i % masti.
- **Tjedni i mjesečni izvještaji** — graf unosa po danu naspram cilja, ukupni i prosječni deficit,
  procjena promjene težine iz deficita naspram stvarne promjene na vagi, prosjeci makronutrijenata,
  dani u cilju, voda, koraci, vježba.
- **Napredak** — graf težine (30/90 dana/sve), napredak prema cilju, BMI, trend zadnjih 28 dana i
  prognoza datuma postizanja cilja (po trendu i po planu).

Svi podaci spremaju se lokalno na uređaju (AsyncStorage).

## Pokretanje

```bash
npm install
npx expo start
```

Zatim skeniraj QR kod iz terminala aplikacijom **Expo Go** (Android/iOS) ili pritisni `a` / `i` / `w`
za Android emulator, iOS simulator ili web.

Za instalaciju kao samostalne aplikacije: `npx eas-cli@latest build --platform android --profile preview`.

## Razvoj

```bash
npm run typecheck   # TypeScript provjera
npm test            # unit testovi izračuna (kalorije, deficit, izvještaji, bar-kod)
```

Struktura:

- `src/app/` — ekrani (Expo Router): `(tabs)/` Dnevnik, Izvještaji, Napredak, Profil; `scan`, `add-food`,
  `food`, `custom-food`, `add-exercise`, `log-weight`, `onboarding`
- `src/lib/` — logika: `calc.ts` (BMR/TDEE/cilj/makro/BMI/trend), `reports.ts`, `openFoodFacts.ts`,
  `store.tsx` (stanje + spremanje), `foods.ts`, `exercises.ts`, `dates.ts`
- `src/components/` — UI komponente i SVG grafovi
