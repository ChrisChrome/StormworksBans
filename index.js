const fs = require("fs");
const express = require("express");
const discord = require("discord.js");
const app = express();
const config = require("./config.json")
const sqlite3 = require('sqlite3')
const db = new sqlite3.Database('bans.db');
const hook = new discord.WebhookClient({url: config.webhook})
db.run(fs.readFileSync("./blank.sql").toString()) // Generate table if not exist

app.get("/check", async (req,res) => {
	if(!req.query.id) return res.sendStatus(400).end();
	db.all("SELECT * FROM bans WHERE id = ?", req.query.id, (err, rows) => {
		if(err) return res.sendStatus(500).end();
		if(rows[0]) {
			data = {
				id: req.query.id,
				ban: true
			}
			res.status(200).send(data).end();
		} else {
			data = {
				id: req.query.id,
				ban: false,
				data: rows[0]
			}
			res.status(200).send(data).end();
		}
	});
})
app.get("/ban", async (req,res) => {
	if(!req.query.auth) return res.sendStatus(400).end();
	if(req.query.auth !== config.security) return res.sendStatus(401).end();
	data = JSON.parse(req.query.data)
	db.run("INSERT INTO bans VALUES (?,?,?,?)", data.id, data.username, data.mod, data.reason?data.reason:"None Given", (err, row) => {
		if(err) {
			return res.status(500).send(err).end();
		}
		hook.send({embeds: [
			{
				title: "Ban Added",
				timestamp: new Date(),
				color: "RED",
				fields: [
					{
						name: "Moderator",
						value: data.mod,
						inline: true
					},
					{
						name: "Username",
						value: data.username?data.username:"Unknown",
						inline: true
					},
					{
						name: "Steam ID",
						value: data.id,
						inline: true
					},
					{
						name: "Reason",
						value: data.reason?data.reason:"None Given",
						inline: true
					}
				]
			}
		]})
		res.status(200).send(row).end();
	})
})

app.get("/unban", async (req, res) => {
	if(!req.query.auth) return res.sendStatus(400).end();
	if(req.query.auth !== config.security) return res.sendStatus(401).end();
	db.run("DELETE FROM bans WHERE id = ?", req.query.id, (err, row) => {
		if(err) return res.status(500).send(err).end();
		hook.send({embeds: [
			{
				title: "Ban Removed",
				timestamp: new Date(),
				color: "GREEN",
				fields: [
					{
						name: "Steam ID",
						value: data.id,
						inline: true
					}
				]
			}
		]})
		res.status(200).send(row).end();
	})
})

app.listen(config.port, config.hostname, () => {
	console.log("server started");
})