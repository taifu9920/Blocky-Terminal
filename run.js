require('dotenv').config();
require('winston-daily-rotate-file')
const express = require("express")
    , winston = require('winston')
    , { combine, timestamp, printf, colorize, align } = winston.format
    , expressWinston = require('express-winston')
    , csurf = require('csurf')
    , cookieParser = require('cookie-parser')
    , compression = require('compression');

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
, });

let app = express();
app.use(compression())
app.set('view engine', 'ejs');

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
    , ignoreRoute: function(req, res) { return false; }
}));


app.use("/", express.static("static"));

app.use(cookieParser());

app.get("/", csurf({ cookie: true }), function(req, res) {
    res.render("index", { csrfToken: req.csrfToken() });
});

app.post("/login", express.urlencoded({extended: false}), csurf({ cookie: true }), function(req, res) {
    if (req.body["account"] == process.env["account"] && req.body["password"] == process.env["password"]) {
        res.render("home", { msg: "Login success!" });
    }else{
        res.redirect("/");
    }
});

app.use((req, res) => {
    res.status(404).send("Request 404");
})

app.listen(process.env["port"], process.env["ip"], () => {
    logger.info(`Server is listening on port number: ${process.env["port"]}`);
});