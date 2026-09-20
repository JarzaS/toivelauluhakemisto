# Toivelaulukirja – PWA

Valmis staattinen verkkosovellus GitHub Pagesiin. Sisältää alkuperäisen `laulut.json`-aineiston, laulunimien ja alkusanojen haun, kirja- ja sivutiedot, omat kappaletiedot, paikalliset muistiinpanot ja JSON-varmuuskopiot.

## Julkaisu GitHub Pagesissa

1. Luo GitHubiin **julkinen** repository, esimerkiksi `toivelaulukirja`.
2. Lataa **tämän kansion sisältö** repositorion juureen (`index.html` tulee juureen).
3. Avaa repositoryn **Settings → Pages → Build and deployment → Deploy from a branch**. Valitse `main` ja `/(root)`, tallenna.
4. Odota julkaisua. Osoite on yleensä `https://KÄYTTÄJÄ.github.io/toivelaulukirja/`.
5. Avaa osoite iPhonen/iPadin Safarissa → Jaa → Lisää Koti-valikkoon.

## Tärkeät rajaukset

- GitHub Pages ja lauluaineisto ovat **julkisia**. Pelkkä linkin jakaminen vain tutuille ei estä muita avaamasta sivua. Älä julkaise aineistoa, jos sinulla ei ole oikeutta jakaa sitä julkisesti.
- Muistiinpanot tallennetaan **IndexedDB:hen laite- ja selainkohtaisesti**, eivät GitHubiin. Tee varmuuskopio kohdasta **Varmuuskopio → Vie JSON-varmuuskopio**. Selaimen tietojen tyhjennys tai laitteen vaihto voi poistaa paikalliset muistiinpanot.
- Voit tuoda Swift-sovelluksen `omat_tiedot.json`-tiedoston, jos saat sen talteen; PWA ei pysty lukemaan sitä automaattisesti iOS-sovelluksen erillisestä tallennustilasta.
- Ensimmäinen käyttökerta vaatii verkkoyhteyden. Kun sovelluksen tiedostot on ladattu ja välimuisti muodostettu, haku ja paikalliset muistiinpanot toimivat yleensä myös offline-tilassa.
- Sovelluksen päivitys voi vaatia verkkoyhteyden ja uudelleenkäynnistyksen. Varmuuskopioi tiedot ennen merkittäviä muutoksia.
- PWA ei asenna eikä suorita alkuperäistä Swift-koodia. Käyttöliittymä ja haku on toteutettu uudelleen JavaScriptillä.

## Paikallinen esikatselu Macilla

Avaa Terminal tässä kansiossa ja suorita `python3 -m http.server 8000`. Avaa sitten `http://localhost:8000`. Pelkkä `index.html`-tiedoston avaaminen Finderissa ei välttämättä toimi selaimen tiedostorajoitusten vuoksi.

## Hakutoiminto

Haku kohdistuu alkuperäisen Swift-version tavoin hakemiston nimiin/alkusanoihin sekä itse lisättyihin kappaleen nimiin, säveltäjiin ja esittäjiin.
