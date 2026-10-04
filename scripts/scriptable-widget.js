// Plüschie-Kalender – kleines Home-Bildschirm-Widget (2×2) für die iOS-App „Scriptable“.
//
// Einrichtung:
//   1. Scriptable aus dem App Store installieren.
//   2. In Scriptable ein neues Skript anlegen, diesen Inhalt einfügen und BASE_URL anpassen.
//   3. Auf dem Home-Bildschirm ein kleines Scriptable-Widget hinzufügen, lange drücken →
//      „Widget bearbeiten“ → Script: dieses Skript, Parameter: der ICAL_TOKEN des Servers.
//
// Heute Geburtstag: Foto des Plüschies als Hintergrund, Name und Alter.
// Sonst: die nächsten drei Geburtstage. Ein Tipp aufs Widget öffnet die Web-App.

const BASE_URL = "https://plushies.example.de"; // ohne Schrägstrich am Ende
const TOKEN = args.widgetParameter || ""; // oder hier fest eintragen

const CACHE_FILE = "plushies-widget.json";

const colors = {
  background: Color.dynamic(new Color("#fff7ed"), new Color("#1c1917")),
  text: Color.dynamic(new Color("#1c1917"), new Color("#fafaf9")),
  muted: Color.dynamic(new Color("#78716c"), new Color("#a8a29e")),
  accent: Color.dynamic(new Color("#ea580c"), new Color("#fb923c")),
};

async function loadData() {
  const fm = FileManager.local();
  const cachePath = fm.joinPath(fm.cacheDirectory(), CACHE_FILE);
  try {
    const req = new Request(`${BASE_URL}/api/widget?token=${encodeURIComponent(TOKEN)}`);
    req.timeoutInterval = 15;
    const data = await req.loadJSON();
    if (req.response.statusCode !== 200) throw new Error(data.error || `HTTP ${req.response.statusCode}`);
    fm.writeString(cachePath, JSON.stringify(data));
    return { data, stale: false };
  } catch (err) {
    // Offline or server down: show the last good state instead of an empty widget.
    if (fm.fileExists(cachePath)) return { data: JSON.parse(fm.readString(cachePath)), stale: true };
    return { error: String(err.message || err) };
  }
}

function whenLabel(entry) {
  if (entry.daysUntil === 1) return "morgen";
  if (entry.daysUntil < 7) return `in ${entry.daysUntil} T.`;
  const [, month, day] = entry.date.split("-");
  return `${day}.${month}.`;
}

function addText(stack, text, { size, weight = "regular", color = colors.text, lines = 1 }) {
  const t = stack.addText(text);
  t.font = weight === "bold" ? Font.boldRoundedSystemFont(size) : Font.mediumRoundedSystemFont(size);
  t.textColor = color;
  t.lineLimit = lines;
  t.minimumScaleFactor = 0.6;
  return t;
}

function buildToday(widget, data) {
  const first = data.today[0];
  const onPhoto = !!data.photo;

  if (onPhoto) {
    // A background image hides any background gradient, so darken the photo itself: a light
    // veil overall and a stronger one at the bottom, where the name sits.
    const photo = Image.fromData(Data.fromBase64String(data.photo));
    const ctx = new DrawContext();
    ctx.size = photo.size;
    ctx.opaque = true;
    ctx.drawImageAtPoint(photo, new Point(0, 0));
    ctx.setFillColor(new Color("#000000", 0.2));
    ctx.fillRect(new Rect(0, 0, photo.size.width, photo.size.height));
    ctx.setFillColor(new Color("#000000", 0.35));
    ctx.fillRect(new Rect(0, photo.size.height * 0.5, photo.size.width, photo.size.height * 0.5));
    widget.backgroundImage = ctx.getImage();
  } else {
    const warm = new LinearGradient();
    warm.colors = [new Color("#fb923c"), new Color("#ec4899")];
    warm.locations = [0, 1];
    widget.backgroundGradient = warm;
  }

  const white = Color.white();
  addText(widget, "🎂 Heute", { size: 13, weight: "bold", color: white });
  widget.addSpacer();
  addText(widget, first.name, { size: 20, weight: "bold", color: white, lines: 2 });
  const extra = [];
  if (first.age) extra.push(`wird ${first.age}`);
  if (data.today.length > 1) extra.push(`+${data.today.length - 1} weitere`);
  if (extra.length) addText(widget, extra.join(" · "), { size: 12, color: white });
}

function buildUpcoming(widget, data) {
  widget.backgroundColor = colors.background;
  addText(widget, "🧸 Geburtstage", { size: 13, weight: "bold", color: colors.accent });
  widget.addSpacer(8);

  if (data.upcoming.length === 0) {
    addText(widget, "Noch keine Plüschies im Kalender", { size: 13, color: colors.muted, lines: 3 });
    widget.addSpacer();
    return;
  }

  for (const entry of data.upcoming.slice(0, 3)) {
    const row = widget.addStack();
    row.centerAlignContent();
    addText(row, entry.name, { size: 14, weight: "bold" });
    row.addSpacer();
    addText(row, whenLabel(entry), { size: 12, color: colors.muted });
    widget.addSpacer(5);
  }
  widget.addSpacer();
}

async function createWidget() {
  const widget = new ListWidget();
  widget.setPadding(14, 14, 14, 14);
  widget.url = BASE_URL;

  const result = await loadData();
  if (result.error) {
    widget.backgroundColor = colors.background;
    addText(widget, "🧸 Plüschies", { size: 13, weight: "bold", color: colors.accent });
    widget.addSpacer();
    addText(widget, TOKEN ? "Keine Verbindung" : "Token fehlt (Widget-Parameter)", { size: 13, color: colors.muted, lines: 3 });
    return widget;
  }

  if (result.data.today.length > 0) buildToday(widget, result.data);
  else buildUpcoming(widget, result.data);

  if (result.stale) {
    widget.addSpacer(2);
    addText(widget, "offline", { size: 9, color: colors.muted });
  }

  // iOS decides the actual refresh time; ask for one shortly after midnight so the day flips.
  const midnight = new Date();
  midnight.setHours(24, 5, 0, 0);
  widget.refreshAfterDate = midnight;
  return widget;
}

const widget = await createWidget();
if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  await widget.presentSmall();
}
Script.complete();
