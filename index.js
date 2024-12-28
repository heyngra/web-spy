import express from 'express';
import ejs from 'ejs';
import Database from 'better-sqlite3';
const port = 8000;
const app = express();
const db = new Database("db.db");
db.pragma("journal_mode = WAL");

// setup db
db.prepare("CREATE TABLE IF NOT EXISTS log (log1 TEXT, log2 TEXT)").run();
db.prepare("CREATE TABLE IF NOT EXISTS img (url TEXT PRIMARY KEY, identifier TEXT, img TEXT)").run();
db.prepare("CREATE TABLE IF NOT EXISTS redirect (url TEXT PRIMARY KEY, identifier TEXT, redirect TEXT)").run();
db.prepare("CREATE TABLE IF NOT EXISTS etag (url TEXT PRIMARY KEY)").run();

const ips = [];

const etag_usernames = {} // not making this into a db cuz im lazy and im adding that only cuz I added that part to the script and I didn't do it in the code, sorry folks lol


app.set('trust proxy', true);
app.set('view engine', 'ejs');
app.engine('html', ejs.renderFile);
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true, limit:"50mb" }));
app.use(express.json({limit: "50mb"}));
//app.set('etag', false)

function logIp(req) {
    console.log(req.ip);
    ips.push(req.ip);
    db.prepare("INSERT INTO log (log1, log2) VALUES (?, ?)").run(req.ip, req.url);
}

function makeid(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    return result;
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

app.get("/etagtracker", (req, res) => {
    let userId;
    const clientEtag = req.headers['if-none-match'];

    if (clientEtag) {
        userId = clientEtag;
    } else {
        userId = makeid(8);
        db.prepare("INSERT INTO etag (url) VALUES (?)").run(userId);
    }
    res.set("ETag", userId);
    res.cookie("userId", userId);
    res.setHeader('Content-Type', 'application/json');
    res.send("const etag='" + userId + "';");

    db.prepare("INSERT INTO log (log1, log2) VALUES (?, ?)").run("ETAG:"+userId, req.url);
})

app.post("/imgcreate", (req, res) => {
    const identify = req.body.identify;
    const imgContent = req.body.imgContent;
    const url = makeid(20);

    db.prepare("INSERT INTO img (url, identifier, img) VALUES (?, ?, ?)").run(url, identify, imgContent);
    res.send(url);
})

app.post("/usernameset", (req, res) => {
    const etag = req.body.etag;
    const username = req.body.username;

    etag_usernames[etag] = username;
    res.status(200);
    res.send("");
});

app.post("/username", (req, res) => {
    const etag = req.body.etag;
    res.send(etag_usernames[etag]);
});


app.post("/urlcreate", (req, res) => {
    const identify = req.body.identify;
    const redirect = req.body.redirect;
    const url = makeid(21);

    db.prepare("INSERT INTO redirect (url, identifier, redirect) VALUES (?, ?, ?)").run(url, identify, redirect);
    res.send(url);
})

app.get("*", async (req, res, next) => {

    const url = req.url.slice(1);
    console.log(url);
    const img = db.prepare("SELECT * FROM img WHERE url = ?").get(url);
    if (img) {
        console.log(img.img);
        const imageData = Buffer.from(img.img.split(",")[1], 'base64');
        res.setHeader('Content-Type', 'image/png');
        res.send(imageData);
        db.prepare("INSERT INTO log (log1, log2) VALUES (?, ?)").run(img.identifier, req.url);
        return;
    }

    const redirect = db.prepare("SELECT * FROM redirect WHERE url = ?").get(url);
    if (redirect) {
        res.redirect(redirect.redirect);
        db.prepare("INSERT INTO log (log1, log2) VALUES (?, ?)").run(redirect.identifier, req.url);
        return;
    }

    logIp(req);
    await next();
})

app.listen(port);