
"use strict";

const $ = id => document.getElementById(id);

// "title" säilyy vanhojen varmuuskopioiden yhteensopivuutta varten,
// mutta sitä ei enää näytetä muokattavana kenttänä.
const FIELDS = ["composer", "lyricist", "performer", "notes"];
const BACKUP_FIELDS = ["title", ...FIELDS];

const LABELS = {
  composer: "Säveltäjä",
  lyricist: "Sanoittaja",
  performer: "Esittäjä",
  notes: "Omat huomautukset"
};

const EMPTY = () => ({
  title: "",
  composer: "",
  lyricist: "",
  performer: "",
  notes: ""
});

let songs = [];
let edits = {};
let selected = null;
let saveTimer = null;
let db = null;

const normalize = s =>
  String(s || "")
    .toLocaleLowerCase("fi")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const detail = s => edits[s.id] || EMPTY();

// Kappaleen nimi tulee hakemistosta, ei käyttäjän tietokentästä.
const name = s => s.aliases[0] || s.id;

// Lauluaineiston tekijätiedot toimivat oletusarvoina.
// Käyttäjän oma tieto voi täydentää tai korvata ne.
const fieldValue = (s, field) =>
  detail(s)[field] || s[field] || "";

function node(tag, text, cls) {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = text;
  if (cls) n.className = cls;
  return n;
}

function openDB() {
  return new Promise((resolve, reject) => {
    // Tietokannan nimi pidetään ennallaan, jotta vanhat tiedot löytyvät.
    const r = indexedDB.open("toivelaulukirja", 1);

    r.onupgradeneeded = () => {
      r.result.createObjectStore("settings");
    };

    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

function readEdits() {
  return new Promise((resolve, reject) => {
    const t = db.transaction("settings", "readonly");
    const r = t.objectStore("settings").get("edits");

    r.onsuccess = () => resolve(r.result || {});
    r.onerror = () => reject(r.error);
  });
}

function writeEdits() {
  return new Promise((resolve, reject) => {
    const t = db.transaction("settings", "readwrite");
    t.objectStore("settings").put(edits, "edits");

    t.oncomplete = resolve;
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

function validEdits(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw Error("Varmuuskopion rakenne ei kelpaa.");
  }

  const cleaned = {};

  for (const [id, record] of Object.entries(value)) {
    if (!songs.some(s => s.id === id)) continue;

    if (!record || typeof record !== "object" || Array.isArray(record)) {
      throw Error("Virheellinen kappaletieto.");
    }

    cleaned[id] = {};

    // Vanha title-kenttä luetaan ja säilytetään, vaikka sitä ei näytetä.
    for (const f of BACKUP_FIELDS) {
      if (record[f] !== undefined && typeof record[f] !== "string") {
        throw Error("Virheellinen kenttä: " + f);
      }

      cleaned[id][f] = record[f] || "";
    }
  }

  return cleaned;
}

function renderResults() {
  const term = normalize($("search").value.trim());
  const box = $("results");

  box.replaceChildren();

  if (!term) {
    $("status").textContent =
      "Kirjoita kappaleen nimi tai osa alkusanoista.";
    return;
  }

  const matches = songs
    .filter(s =>
      [
        ...s.aliases,
        fieldValue(s, "composer"),
        fieldValue(s, "lyricist"),
        fieldValue(s, "performer")
      ].some(x => normalize(x).includes(term))
    )
    .sort((a, b) => name(a).localeCompare(name(b), "fi"));

  $("status").textContent = matches.length + " hakutulosta";

  const fragment = document.createDocumentFragment();

  for (const s of matches.slice(0, 150)) {
    const b = node(
      "button",
      undefined,
      "result" + (selected === s.id ? " active" : "")
    );

    b.type = "button";

    b.append(
      node("strong", name(s)),
      node("small", s.aliases.join(" · ")),
      node(
        "small",
        "Kirja " + s.book + " · Sivu " + s.page,
        "location"
      )
    );

    b.addEventListener("click", () => showSong(s.id));
    fragment.append(b);
  }

  box.append(fragment);

  if (matches.length > 150) {
    box.append(
      node(
        "p",
        "Näytetään 150 ensimmäistä tulosta. Tarkenna hakua.",
        "hint"
      )
    );
  }
}

function showSong(id) {
  const s = songs.find(x => x.id === id);
  if (!s) return;

  selected = id;
  document.body.classList.add("show-detail");

  const root = $("detail");
  root.replaceChildren();

  const card = node("article", undefined, "detail-card");

  const back = node("button", "← Takaisin hakuun", "back");
  back.type = "button";

  back.addEventListener("click", () => {
    document.body.classList.remove("show-detail");
    $("search").focus();
  });

  card.append(back, node("h1", name(s)));

  const meta = node("div", undefined, "meta");

  meta.append(
    node("span", "Kirja " + s.book, "pill"),
    node("span", "Sivu " + s.page, "pill")
  );

  card.append(
    meta,
    node("p", "Kappale-ID: " + s.id, "hint"),
    node("h2", "Hakemiston nimet ja alkusanat")
  );

  const ul = node("ul", undefined, "aliases");

  s.aliases.forEach(a => ul.append(node("li", a)));

  card.append(ul, node("h2", "Kappaletiedot"));

  const status = node("p", "", "save-status");

  // Kappaleen nimeä ei enää kysytä käyttäjältä.
  for (const f of FIELDS) {
    if (f === "notes") {
      card.append(node("h2", "Omat huomautukset"));
    }

    const label = node("label", LABELS[f], "field");
    const input = document.createElement(
      f === "notes" ? "textarea" : "input"
    );

    if (f !== "notes") input.type = "text";

    input.value = fieldValue(s, f);
    input.autocomplete = "off";

    label.append(input);

    input.addEventListener("input", () => {
      const entry = {
        ...EMPTY(),
        ...detail(s),
        [f]: input.value
      };

      // Jos käyttäjä tyhjentää kentän, aineiston oletusarvo
      // voi jälleen näkyä. Muut omat tiedot säilyvät.
      edits[s.id] = entry;

      status.textContent = "Tallennetaan…";

      clearTimeout(saveTimer);

      saveTimer = setTimeout(async () => {
        try {
          await writeEdits();
          status.textContent = "Tallennettu tälle laitteelle.";
          renderResults();
        } catch (e) {
          status.textContent =
            "Tallennus epäonnistui. Vie varmuuskopio ja tarkista selaimen tallennustila.";
          console.error(e);
        }
      }, 350);
    });

    card.append(label);
  }

  card.append(
    status,
    node(
      "p",
      "Omat tiedot tallentuvat vain tähän laitteeseen. " +
      "Ne eivät siirry automaattisesti iPhonen, iPadin " +
      "tai muiden käyttäjien laitteiden välillä. " +
      "Tee varmuuskopio säännöllisesti.",
      "hint"
    )
  );

  root.append(card);
  renderResults();
}

$("search").addEventListener("input", renderResults);

$("backupButton").addEventListener("click", () => {
  $("backupDialog").showModal();
});

$("exportButton").addEventListener("click", async () => {
  try {
    clearTimeout(saveTimer);
    await writeEdits();

    const blob = new Blob(
      [JSON.stringify(edits, null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download =
      "omat_tiedot-" +
      new Date().toISOString().slice(0, 10) +
      ".json";

    document.body.append(a);
    a.click();
    a.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);

    $("backupStatus").textContent =
      "Varmuuskopio luotu. Tallenna tiedosto turvalliseen paikkaan.";
  } catch (e) {
    $("backupStatus").textContent =
      "Varmuuskopiointi epäonnistui: " + e.message;
  }
});

$("importFile").addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const parsed = validEdits(
      JSON.parse(await file.text())
    );

    if (
      !confirm(
        "Palautetaanko " +
        Object.keys(parsed).length +
        " kappaleen tiedot? Nykyiset omat tiedot korvataan."
      )
    ) {
      return;
    }

    clearTimeout(saveTimer);

    const previous = edits;
    edits = parsed;

    try {
      await writeEdits();
    } catch (error) {
      edits = previous;
      throw error;
    }

    $("backupStatus").textContent = "Varmuuskopio palautettu.";

    renderResults();

    if (selected) showSong(selected);
  } catch (error) {
    $("backupStatus").textContent =
      "Palautus epäonnistui: " + error.message;
  } finally {
    e.target.value = "";
  }
});

(async () => {
  try {
    const response = await fetch("./laulut.json");

    if (!response.ok) {
      throw Error(
        "Lauluaineistoa ei voitu ladata (" +
        response.status +
        ")."
      );
    }

    songs = await response.json();

    if (
      !Array.isArray(songs) ||
      !songs.every(
        s =>
          typeof s.id === "string" &&
          Array.isArray(s.aliases)
      )
    ) {
      throw Error("Lauluaineiston muoto on virheellinen.");
    }

    db = await openDB();
    edits = validEdits(await readEdits());

    renderResults();

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("./service-worker.js")
        .catch(console.warn);
    }
  } catch (e) {
    $("status").textContent =
      "Sovelluksen käynnistys epäonnistui: " + e.message;

    console.error(e);
  }
})();
