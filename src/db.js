const mysql = require('mysql');

const makeConnection = () => mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'xjp142065',
    database: 'numberProduct'
});

const command = (operation, callBack) => {
    const connection = makeConnection();

    connection.connect();

    connection.query(operation, callBack);

    connection.end();
};

module.exports = {
    command
}