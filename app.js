require("dotenv").config();
const { Pool } = require("pg");
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;

const DB_URL = `postgres://apple:password@localhost:5432/users`;

const pool = new Pool({
  connectionString: DB_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const app = express();

app.set("views", __dirname);
app.set("view engine", "ejs");

app.use(session({ secret: "cats", resave: false, saveUninitialized: false }));
app.use(passport.session());
app.use(express.urlencoded({ extended: false }));
app.get("/", (req, res) => res.render("index"));

app.listen(3000, () => console.log("app listening on port 3000!"));
