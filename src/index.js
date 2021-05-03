const express = require('express');
const db = require('./db');
const sha = require('sha1');

const app = express();
const port = 3000;

const result = (errMsg, errno = 0) => ({errMsg, errno});

app.get('/', (req, res) => {
    res.send('这是主页啦');
});

app.get('/register', (req, res) => {
    console.log(req.query);
    const {name, psd} = req.query;
    if (name && psd) {
        db.command(`SELECT * from usertbl WHERE user_name = "${name}"`, (err, rows) => {
            if (!err) {
                if (rows[0]) {
                    res.send(result('该昵称已被占用！', 2));
                } else {
                    db.command(`INSERT INTO usertbl (user_name, user_psd, product_list) VALUES ("${name}", "${sha(psd)}", "[]");`, (err, rows, fields) => {
                        if (!err) {
                            res.send(JSON.stringify(result('注册成功！')));
                        } else {
                            res.send(JSON.stringify(result('注册失败！', 1)));
                        }
                    });
                }
            } else {
                res.send(JSON.stringify(result('注册失败！', 1)));
            }
        });
    } else {
        res.send(JSON.stringify(result('名称或密码未完善！', 1)));
    }
});

app.listen(port, () => {
    console.log(`app is running at http://localhost:${port}`);
});