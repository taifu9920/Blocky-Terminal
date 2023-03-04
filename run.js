require('dotenv').config();
require('winston-daily-rotate-file')
const { save, load } = require("./database.js")
const fs = require('fs');
const path = require('path');
const { spawn } = require("child_process");
const os = require("os");
const kill = require('tree-kill');
const pidusageTree = require('pidusage-tree')
const es = require('event-stream');
const readLastLines = require('read-last-lines');
const multer = require('multer')
tmpDir = `filesys/php${process.env["TmpDir"]}`
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, tmpDir)
    }
})
var upload = multer({ storage: storage })
maxRAM_MB = os.totalmem() / (1024 * 1024);

filesysDir = process.env["filesysDir"]
serverdir = `${filesysDir}${process.env["ServerDir"]}`
logLoc = `${filesysDir}${process.env["LogDir"]}`
trashDir = `${filesysDir}/.trash`
if (!fs.existsSync(filesysDir)) fs.mkdirSync(filesysDir);
if (!fs.existsSync(trashDir)) fs.mkdirSync(trashDir);

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

function getLoggerLoc(folder) {
    if (!fs.existsSync(filesysDir)) fs.mkdirSync(filesysDir);
    if (!fs.existsSync(logLoc)) fs.mkdirSync(logLoc);
    return `${logLoc}/${folder}.log`
}

function filter(parameter) {
    parameter = parameter.trim()
    if (parameter != "") return parameter.split(" ")[0];
    return undefined;
}
function filter_escape(parameter) {
    return parameter.replaceAll("&", "").replaceAll("|", "").trim()
}

function servers() {
    if (!fs.existsSync(filesysDir)) fs.mkdirSync(filesysDir);
    if (!fs.existsSync(serverdir)) fs.mkdirSync(serverdir);
    return fs.readdirSync(serverdir).filter(loc => fs.statSync(path.join(serverdir, loc)).isDirectory() && !loc.startsWith("."))
}
var rams = new Map();

async function UsageUpdator(folder) {
    result = await pidusageTree(serverStatus.get(folder).pid)
    temp = 0;
    for (var o in result) temp += result[o]["memory"]
    rams.set(folder, temp)
}

function jarfiles(folder) {
    return fs.readdirSync(`${serverdir}/${folder}`).filter(loc => fs.statSync(path.join(`${serverdir}/${folder}`, loc)).isFile() && loc.endsWith(".jar"))
}

function checks() {
    serverlist = servers();
    for (i = 0; i < serverlist.length; i++) {
        folder = serverlist[i]
        if (db[folder] == undefined) {
            db[folder] = {
                java: "java",
                arg: "",
                filename: jarfiles(folder)[0],
                Xmx: 0.5,
                Xms: 0.5
            }
        }
    }
}

let app = express();

app.use(compression())
app.engine('ejs', require("ejs-locals"))
app.set('view engine', 'ejs');

let phpRoute = express();
phpExpress = require('php-express')({
    binPath: 'php'
});
phpRoute.use(compression())
phpRoute.set('views', './filesys');
phpRoute.engine('php', phpExpress.engine);
phpRoute.set('view engine', 'php');
phpRoute.all(/.+\.php/, express.urlencoded({ extended: false }), upload.any(), phpExpress.router);
phpRoute.get("/", function (req, res) {
    res.redirect('/filesys/index.php');
});

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
        var process = serverStatus.get(data["folder"].trim())
        if (process != undefined) process.stdin.write(data["cmd"].trim() + "\n");
    })
    socket.on("init", () => {
        checks();
        serverStatus.forEach((v, k, self) => {
            socket.emit("poweron", k);
        })
        socket.emit("init")
    })
    socket.on("fetch", folder => {
        folder = filter_escape(folder)
        socket.emit("update_config", { folder: folder, config: db[folder] })
        loc = getLoggerLoc(folder)
        try {
            fs.accessSync(loc, fs.constants.R_OK)
            var buffer = ""
            readLastLines.read(loc, 500).then((lines) => socket.emit("log", { folder: folder, msg: `${lines}` }));
        } catch (err) {

        }
    })
    socket.on("newJava", path => {
        path = filter_escape(path)
        db["javas"] = db["javas"].concat(path)
        save();
        socket.emit("alert", { folder: folder, type: 0, msg: "New java path appended!" })
        io.emit("newJava", path)
    })
    socket.on("deleteJava", path => {
        path = filter_escape(path)
        db["javas"] = db["javas"].filter(x => filter_escape(x) != path)
        save();
        socket.emit("alert", { folder: folder, type: 0, msg: "Deleted a java path" })
        io.emit("deleteJava", path)
    })
    socket.on("updateJava", obj => {
        old = filter_escape(obj["old"])
        news = filter_escape(obj["new"])
        db["javas"] = db["javas"].filter(x => filter_escape(x) != old).concat(news)
        save();
        socket.emit("alert", { folder: folder, type: 0, msg: "Updated a java path" })
        io.emit("deleteJava", old)
        io.emit("newJava", news)
    })
    socket.on("scram", folder => {
        folder = filter_escape(folder)
        if (serverStatus.get(folder) != undefined) {
            kill(serverStatus.get(folder).pid);
            io.emit("alert", { folder: folder, type: 0, msg: "Server killed!" })
        }
    })
    function toggle(folder) {
        folder = filter_escape(folder)
        if (serverStatus.get(folder) == undefined) {
            //power on
            if (db[folder] == undefined || db[folder]["filename"] == "") {
                //no jarfile
                socket.emit("alert", { folder: folder, type: 1, msg: "Need jar filename to boot, require configure!" })
            } else {
                execs = [`-Xmx${db[folder]["Xmx"] * 1024}M`, `-Xms${db[folder]["Xms"] * 1024}M`].concat(db[folder]["arg"].split(" "), "-jar", db[folder]["filename"], "nogui")
                cmd = [db[folder]["java"]].concat(execs).join(" ") + "\n"

                io.emit("log", { folder: folder, msg: cmd })
                serverStatus.set(folder, spawn(`"${db[folder]["java"]}"`, execs, { cwd: `${serverdir}/${folder}/`, shell: true }));

                serverStatus.get(folder).loggerStream = fs.createWriteStream(getLoggerLoc(folder), { flags: 'w' });
                serverStatus.get(folder).loggerStream.write(cmd)

                function log(data) {
                    decoded = iconv.decode(data, "big5");
                    io.emit("log", { folder: folder, msg: decoded });
                    serverStatus.get(folder).loggerStream.write(decoded)
                }

                serverStatus.get(folder).stdout.on("data", log)

                serverStatus.get(folder).stderr.on("data", log)

                serverStatus.get(folder).on("exit", code => {
                    clearInterval(serverStatus.get(folder).updator)
                    rams.delete(folder)
                    notify = `Process exited with code ${code}.\n`
                    serverStatus.get(folder).loggerStream.write(notify)
                    io.emit("log", { folder: folder, msg: notify });
                    reboot = serverStatus.get(folder).reboot
                    serverStatus.get(folder).loggerStream.end()
                    serverStatus.delete(folder);
                    io.emit("poweroff", folder)
                    if (reboot) toggle(folder)
                })
                io.emit("poweron", folder)
                serverStatus.get(folder).updator = setInterval(() => { UsageUpdator(folder) }, 1000 * 5);
            }
        } else {
            //power off
            serverStatus.get(folder).stdin.write("stop\n");
        }
    }
    socket.on("reboot", folder => {
        folder = filter_escape(folder)
        if (serverStatus.get(folder) != undefined && serverStatus.get(folder).reboot != true) {
            serverStatus.get(folder).reboot = true;
            toggle(folder);
            io.emit("alert", { folder: folder, type: 0, msg: "Server will reboot now." })
        }
    })
    socket.on("toggle", toggle)
    socket.on("config", data => {
        folder = filter_escape(data["folder"])
        if (folder != undefined) {
            data["java"] = filter_escape(data["java"])
            data["arg"] = filter_escape(data["arg"])
            data["filename"] = filter(data["filename"])
            data["Xmx"] = filter(data["Xmx"])
            data["Xms"] = filter(data["Xms"])

            db[folder] = {
                java: data["java"],
                arg: data["arg"],
                filename: data["filename"] == undefined ? "" : data["filename"],
                Xmx: data["Xmx"] == undefined ? "" : data["Xmx"],
                Xms: data["Xms"] == undefined ? "" : data["Xms"]
            }
            save()
            socket.emit("alert", { folder: folder, type: 0, msg: "Config file saved!" })
            io.emit("update_config", { folder: folder, config: db[folder] })
        }
    })
});

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

app.get("/", auth, async function (req, res) {
    serverlist = servers()
    res.render("home", {
        username: req.session.username, msg: "",
        javas: db["javas"], server_list: serverlist,
        server: "", freeRAM: os.freemem() / (1024 * 1024),
        maxRAM: maxRAM_MB, sevRAM: rams
    });
});

app.get("/server/:folder", auth, function (req, res) {
    res.render("server", {
        username: req.session.username, msg: "",
        javas: db["javas"], jarfiles: jarfiles(req.params["folder"]),
        server_list: servers(), server: req.params["folder"],
        maxRAM: maxRAM_MB
    });
});

app.use("/filesys", auth, phpRoute);
app.use("/filesys", express.static("filesys"));

app.use((req, res) => {
    res.status(404).send("Request 404");
})

http.listen(process.env["port"], process.env["ip"], () => {
    logger.info(`Server is listening on port number: ${process.env["port"]}`);
})