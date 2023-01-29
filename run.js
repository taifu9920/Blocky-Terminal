require('dotenv').config();
require('winston-daily-rotate-file')
const { save, load } = require("./database.js")
const fs = require('fs');
const path = require('path');
const { spawn } = require("child_process");

const express = require("express")
    , winston = require('winston')
    , { combine, timestamp, printf, colorize, align } = winston.format
    , expressWinston = require('express-winston')
    , csurf = require('csurf')
    , cookieParser = require('cookie-parser')
    , compression = require('compression')
    , session = require('express-session');

let logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info'
    , format: combine(
        colorize({ all: true })
        , timestamp({ format: 'YYYY-MM-DD hh:mm:ss.SSS A' })
        , align()
        , printf((info) => `[${info.timestamp}] ${info.level}: ${info.message}`)
    )
    , transports: [new winston.transports.Console()
        , new winston.transports.DailyRotateFile({
            filename: './logs/%DATE%.log'
            , datePattern: 'YYYY-MM-DD'
            , maxFiles: '31d'
        })
    ]
    ,
});

let app = express();
app.use(compression())
app.engine('ejs', require("ejs-locals"))
app.set('view engine', 'ejs');

db = load();

app.use(session({
    secret: db["secret"],
    saveUninitialized: false,
    resave: true,
}));

app.use(expressWinston.logger({
    transports: [new winston.transports.Console()]
    , format: combine(
        colorize({ all: true })
        , timestamp({ format: 'YYYY-MM-DD hh:mm:ss.SSS A' })
        , align()
        , printf((info) => `[${info.timestamp}] ${info.level}: ${info.message}`)
    )
    , meta: true
    , msg: "{{req.socket.remoteAddress}} ({{req.headers['x-forwarded-for']}}) - {{res.statusCode}} {{req.method}} {{res.responseTime}}ms {{req.url}}"
    , expressFormat: false
    , ignoreRoute: function (req, res) { return false; }
}));

app.use("/", express.static("static"));

app.use(cookieParser());

var serverStatus = new Map();
save()
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var iconv = require("iconv-lite")
io.on('connection', (socket) => {
    socket.on("cmd", data => {
        var process = serverStatus.get(data["folder"])
        if (process != undefined) process.stdin.write(data["cmd"]);
    })
    socket.on("init", () => {
        serverStatus.forEach((v, k, self) => {
            socket.emit("poweron", k);
        })
        socket.emit("init")
    })
    socket.on("fetch", folder => {
        socket.emit("update_config", { folder: folder, config: db[folder] })
    })
    socket.on("toggle", folder => {
        if (serverStatus.get(folder) == undefined) {
            //power on
            serverStatus.set(folder, spawn("ping", ["1.1.1.1"]));

            serverStatus.get(folder).stdout.on("data", data => {
                io.emit("log", { folder: folder, msg: iconv.decode(data, "big5") });
            })

            serverStatus.get(folder).stderr.on("data", data => {
                io.emit("log", { folder: folder, msg: iconv.decode(data, "big5") });
            })

            serverStatus.get(folder).on("exit", code => {
                io.emit("log", { folder: folder, msg: `Process exited with code ${code}.` });
                serverStatus.delete(folder);
                io.emit("poweroff", folder)
            })
            io.emit("poweron", folder)
        } else {
            //power off
            serverStatus.get(folder).stdin.write("stop");
        }
    })
    socket.on("config", data => {
        folder = data["folder"]
        db[folder] = {
            arg: data["arg"],
            filename: data["filename"],
            Xmx: data["Xmx"],
            Xms: data["Xms"]
        }
        save()
        socket.emit("alert", { type: 0, msg: "Config file saved!" })
        io.emit("update_config", { folder: folder, config: db[folder] })
    })
});
http.listen(process.env["port"])

// Before Login

app.get("/signin", csurf({ cookie: true }), function (req, res) {
    let cookie = req.cookies["msg"];
    res.clearCookie("msg", { httpOnly: true });
    res.render("index", { csrfToken: req.csrfToken(), "msg": cookie });
});

app.post("/login", express.urlencoded({ extended: false }), csurf({ cookie: true }), function (req, res) {
    if (req.body["account"] == process.env["account"] && req.body["password"] == process.env["password"]) {
        req.session.username = process.env["account"];
        res.redirect("/");
    }
    else {
        res.cookie("msg", "Wrong information", { httpOnly: true });
        res.redirect("/signin");
    }
});

app.get("/logout", function (req, res) {
    req.session.destroy();
    res.cookie("msg", "You have been logout.", { httpOnly: true });
    res.redirect('/signin');
});

// After login
function auth(req, res, next) {
    if (req.session.username == process.env["account"]) next()
    else {
        if (req.cookies["msg"] == undefined) {
            return res.redirect('/signin')
        } else {
            res.cookie("msg", "Wrong information", { httpOnly: true });
            return res.redirect('/signin')
        }
    }
}

app.get("/", auth, function (req, res) {
    const servers = fs.readdirSync("Servers").filter(loc => fs.statSync(path.join("Servers", loc)).isDirectory());
    res.render("home", { username: req.session.username, msg: "", server_list: servers, server: "" });
});

app.get("/server/:folder", auth, function (req, res) {
    const servers = fs.readdirSync("Servers").filter(loc => fs.statSync(path.join("Servers", loc)).isDirectory());

    res.render("server", { username: req.session.username, msg: "", server_list: servers, server: req.params["folder"] });
});

app.use((req, res) => {
    res.status(404).send("Request 404");
})

app.listen(process.env["port"], process.env["ip"], () => {
    logger.info(`Server is listening on port number: ${process.env["port"]}`);
});