const fs = require("fs");
const express = require("express");
const app = express();
const config = require("./config.json")
const sqlite3 = require('sqlite3')
const db = new sqlite3.Database('bans.db');
db.run(fs.readFileSync("./blank.sql").toString()) // Generate table if not exist

app.get("/check", async (req,res) => {
	if(!req.query.id) return res.sendStatus(400).end();
	db.all("SELECT * FROM bans WHERE id = ?", req.query.id, (err, rows) => {
		if(err) return res.sendStatus(500).end();
		if(rows[0]) {
			res.status(200).send(true).end();
		} else {
			res.status(200).send(false).end();
		}
	});
})
app.get("/ban", async (req,res) => {
	if(!req.query.auth) return res.sendStatus(400).end();
	if(req.query.auth !== config.security) return res.sendStatus(401).end();
	db.run("INSERT INTO bans VALUES (?,?,?,?)", req.query.id, req.query.username, req.query.mod, req.query.reason?req.query.reason:"None Given", (err, row) => {
		if(err) {
			return res.status(500).send(err).end();
		}
		res.status(200).send(row).end();
	})
})

app.get("/unban", async (req, res) => {
	if(!req.query.auth) return res.sendStatus(400).end();
	if(req.query.auth !== config.security) return res.sendStatus(401).end();
	db.run("DELETE FROM bans WHERE id = ?", req.query.id, (err, row) => {
		if(err) return res.status(500).send(err).end();
		res.status(200).send(row).end();
	})
})

app.listen(config.port, config.hostname, () => {
	console.log("server started");
})