const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const process = require('./process');
const bodyParser = require('body-parser');


const app = express();
const port = 3000;

app.use(cookieParser());
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

for (let url in process.url) {
    if (process.url.hasOwnProperty(url)) {
        const road = process.url[url];
        app[road.method](url, (req, res) => {
            if (!road.inWhiteList) {
                const name = process.auth(req, res);
                name && road.callback(req, res, name);
            } else {
                road.callback(req, res);
            }
        });
    }
}

app.listen(port, () => {
    console.log(`app is running at http://localhost:${port}`);
});