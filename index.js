import express from 'express';
import ejs from 'ejs';
import Database from 'better-sqlite3';
const port = 7654;
const app = express();
const db = new Database("db.db");
db.pragma("journal_mode = WAL");

// setup db
db.prepare("CREATE TABLE IF NOT EXISTS log (log1 TEXT, log2 TEXT)").run();
db.prepare("CREATE TABLE IF NOT EXISTS img (url TEXT PRIMARY KEY, img BLOB)").run();
db.prepare("CREATE TABLE IF NOT EXISTS redirect (url TEXT PRIMARY KEY, redirect TEXT)").run();
db.prepare("CREATE TABLE IF NOT EXISTS etag (url TEXT PRIMARY KEY)").run();

const ips = [];


app.set('trust proxy', true);
app.set('view engine', 'ejs');
app.engine('html', ejs.renderFile);
app.use(express.static('public'));

function logIp(req) {
    console.log(req.ip);
    ips.push(req.ip);
    db.prepare("INSERT INTO log (log1, log2) VALUES (?, ?)").run(req.ip, req.url);
}

app.get("/", (req, res) => {
    logIp(req);
    res.render("index.html");
})

app.get("/youtube", (req, res) => {
    logIp(req);
    res.render("youtube.html");
})

app.get("/about", (req, res) => {
    logIp(req);
    res.render("about.html")
})

app.get("/admin", (req, res) => {
    res.render("admin.html", { data: db.prepare("SELECT * FROM log").all() });
})


app.get(async (req, res, next) => {
    logIp(req);
    await next();
})

app.listen(port);