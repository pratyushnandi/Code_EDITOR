const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

const out = $("#output");
const preview = $("#preview");
const STORAGE_KEY = "academy-codelab-web";

const escapeHtml = s =>
    String(s).replace(/[&<>"]/g, c =>
    ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;"
    }[c])
    );

function log(msg, type = "info") {
    const color =
        type === "error"
            ? "var(--err)"
            : type === "warn"
                ? "var(--warn)"
                : "var(--brand)";

    const time = new Date().toLocaleTimeString();
    const line = document.createElement("div");
    line.innerHTML = `<span style="color:${color}">[${time}]</span> ${escapeHtml(msg)}`;
    out.appendChild(line);
    out.scrollTop = out.scrollHeight;
}

function clearOut() {
    out.innerHTML = "";
}
$("#clearOut")?.addEventListener("click", clearOut);

function makeEditor(id, mode) {
    const ed = ace.edit(id, {
        theme: "ace/theme/dracula",
        mode,
        tabSize: 2,
        useSoftTabs: true,
        showPrintMargin: false,
        wrap: true
    });

    ed.session.setUseWrapMode(true);

    ed.commands.addCommand({
        name: "run",
        bindKey: { win: "Ctrl-Enter", mac: "Command-Enter" },
        exec() {
            runWeb(false);
        }
    });

    ed.commands.addCommand({
        name: "save",
        bindKey: { win: "Ctrl-S", mac: "Command-S" },
        exec() {
            saveProject();
        }
    });

    return ed;
}

const ed_html = makeEditor("ed_html", "ace/mode/html");
const ed_css = makeEditor("ed_css", "ace/mode/css");
const ed_js = makeEditor("ed_js", "ace/mode/javascript");

const TAB_ORDER = ["html", "css", "js"];
const wraps = Object.fromEntries(
    $$("#webEditors .editor-wrap").map(w => [w.dataset.pane, w])
);

const editor = { html: ed_html, css: ed_css, js: ed_js };

function activePane() {
    const t = $("#webTabs .tab.active");
    return t ? t.dataset.pane : "html";
}

function showPane(name) {
    TAB_ORDER.forEach(k => {
        if (wraps[k]) wraps[k].hidden = k !== name;
    });

    $$("#webTabs .tab").forEach(t => {
        const on = t.dataset.pane === name;
        t.classList.toggle("active", on);
        t.setAttribute("aria-selected", on);
        t.tabIndex = on ? 0 : -1;
    });

    requestAnimationFrame(() => {
        const ed = editor[name];
        if (ed && ed.resize) {
            ed.resize(true);
            ed.focus();
        }
    });
}

$("#webTabs")?.addEventListener("click", e => {
    const btn = e.target.closest(".tab");
    if (!btn) return;
    showPane(btn.dataset.pane);
});

$("#webTabs")?.addEventListener("keydown", e => {
    const idx = TAB_ORDER.indexOf(activePane());
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const delta = e.key === "ArrowLeft" ? -1 : 1;
        showPane(TAB_ORDER[(idx + delta + TAB_ORDER.length) % TAB_ORDER.length]);
    }
});

showPane("html");

function buildWebSrcdoc(withTests = false) {
    const html = ed_html.getValue();
    const css = ed_css.getValue();
    const js = ed_js.getValue();
    const tests = ($("#testArea")?.value || "").trim();

    return `
<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Preview</title>
<style>${css}</style>
</head>
<body>
${html}
<script>
try {
${js}
${withTests && tests ? `\n/* tests */\n${tests}` : ""}
} catch(e) {
console.error(e);
}
<\/script>
</body>
</html>`;
}

function runWeb(withTests = false) {
    preview.srcdoc = buildWebSrcdoc(withTests);
    log(withTests ? "Run with tests" : "Web preview updated.");
}

$("#runWeb")?.addEventListener("click", () => runWeb(false));
$("#runTests")?.addEventListener("click", () => runWeb(true));

$("#openPreview")?.addEventListener("click", () => {
    const src = buildWebSrcdoc(false);
    const w = window.open("about:blank");
    w.document.open();
    w.document.write(src);
    w.document.close();
});

function projectJSON() {
    return {
        version: 1,
        kind: "web-only",
        assignment: $("#assignment")?.value || "",
        html: ed_html.getValue(),
        css: ed_css.getValue(),
        js: ed_js.getValue(),
        tests: $("#testArea")?.value || ""
    };
}

function loadProject(obj) {
    try {
        if ($("#assignment")) $("#assignment").value = obj.assignment || "";
        if ($("#testArea")) $("#testArea").value = obj.tests || "";
        ed_html.setValue(obj.html || "", -1);
        ed_css.setValue(obj.css || "", -1);
        ed_js.setValue(obj.js || "", -1);
        log("Web project loaded.");
    } catch (e) {
        log("Unable to load project: " + e, "error");
    }
}

function setDefaultContent() {
    ed_html.setValue("<!-- Write your HTML code here -->", -1);
    ed_css.setValue("/* Write your CSS here */", -1);
    ed_js.setValue("// Write your JavaScript here", -1);
}

function saveProject() {
    try {
        const data = JSON.stringify(projectJSON(), null, 2);
        localStorage.setItem(STORAGE_KEY, data);
        const blob = new Blob([data], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "codeex-space.json";
        a.click();
        log("Saved locally and downloaded JSON file.");
    } catch (e) {
        log("Unable to save: " + e, "error");
    }
}

$("#saveBtn")?.addEventListener("click", saveProject);
$("#loadBtn")?.addEventListener("click", () => $("#openFile").click());
$("#openFile")?.addEventListener("change", async e => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
        const obj = JSON.parse(await f.text());
        loadProject(obj);
    } catch (err) {
        log("Invalid project file", "error");
    }
});

try {
    const cache = localStorage.getItem(STORAGE_KEY);
    if (cache) loadProject(JSON.parse(cache));
    else setDefaultContent();
} catch {
    setDefaultContent();
}

log("Ready - Web Only Editor (HTML / CSS / JS)");
