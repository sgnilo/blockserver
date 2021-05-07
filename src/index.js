const express = require('express');
const cookieParser = require('cookie-parser');
const process = require('./process');
const multer = require('multer');
const bodyParser = require('body-parser');

const upload = multer({dest: './file'});

const app = express();
const port = 3000;

app.use(cookieParser());
app.use(bodyParser.urlencoded({ limit: '100mb', extended: false }))
app.use(bodyParser.json({limit: '100mb'}))


app.all('*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", req.headers.origin); //需要显示设置来源
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Credentials", true); //带cookies
    res.header("X-Powered-By",' 3.2.1')
    res.header("Content-Type", "application/json;charset=utf-8");
    next();
})

for (let url in process.url) {
    if (process.url.hasOwnProperty(url)) {
        const road = process.url[url];
        road.preProcess ? app[road.method](url, road.preProcess, (req, res) => {
            if (!road.inWhiteList) {
                const name = process.auth(req, res);
                if (name) {
                    process.makeToken(req, res, name);
                    road.callback(req, res, name);
                }
            } else {
                road.callback(req, res);
            }
        }) : app[road.method](url, (req, res) => {
            if (!road.inWhiteList) {
                const name = process.auth(req, res);
                if (name) {
                    process.makeToken(req, res, name);
                    road.callback(req, res, name);
                }
            } else {
                road.callback(req, res);
            }
        });
    }
}

app.listen(port, () => {
    console.log(`app is running at http://localhost:${port}`);
});