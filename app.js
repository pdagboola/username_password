require("dotenv").config();
const { Pool } = require("pg");
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const crypto = require("crypto");
const path = require("path");

const DB_URL = `postgres://apple:password@localhost:5432/users`;

const pool = new Pool({
  connectionString: DB_URL,
});

const app = express();

// app.set("views", path.join("public", __dirname));
app.set("views");

app.set("view engine", "ejs");

// app.use(session({ secret: "cats", resave: false, saveUninitialized: false }));
// app.use(passport.session());
app.use(express.urlencoded({ extended: false }));
app.use(
  session({
    secret: "keyboard cat",
    resave: false,
    saveUninitialized: false,
    // store: new SQLiteStore({
    //   db: "sessions.db",
    //   dir: "./db",
    // }),
  })
);
app.use(passport.authenticate("session"));

passport.use(
  new LocalStrategy(async function verify(username, password, cb) {
    await pool.query(`SELECT * FROM users WHERE username LIKE $1`, [username]),
      function (err, row) {
        if (err) {
          return cb(err);
        }
        if (!row) {
          console.log("user not found");
          cb(null, false, { message: "Incorrect username or password" });
        }
        crypto.pbkdf2(
          password,
          row.salt,
          310000,
          32,
          "sha256",
          function (err, hashedPassword) {
            if (err) {
              return cb(err);
            }
            if (!crypto.timingSafeEqual(row.password == hashedPassword)) {
              console.log("Incorrect password");
              cb(null, false, { message: "Incorrect username or password" });
            }
          }
        );
        cb(null, row);
      };
  })
);
passport.serializeUser(function (user, cb) {
  process.nextTick(function () {
    cb(null, { id: user.id, username: user.username });
  });
});
passport.deserializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, user);
  });
});
app.get("/", (req, res) => res.render("index"));
app.get("/sign-up", (req, res) => res.render("sign-up-form"));
app.post("/sign-up", async (req, res, next) => {
  const { username, password } = req.body;
  const salt = crypto.randomBytes(16);
  try {
    // await pool.query(`DROP TABLE IF EXISTS users`);
    await pool.query(`CREATE TABLE IF NOT EXISTS users(
      id INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      username VARCHAR(255), 
      hashed_password BYTEA, 
      salt BYTEA
      
      );`);
  } catch (err) {
    throw err;
  }
  crypto.pbkdf2(
    password,
    salt,
    310000,
    32,
    "sha256",
    async function (err, hashedPassword) {
      console.log("heres the hashed password", hashedPassword);
      if (err) {
        console.log("error hashing password");
        return next(err);
      }
      try {
        const { rows } = await pool.query(
          `INSERT INTO users(username, hashed_password, salt) VALUES ($1, $2, $3) RETURNING id`,
          [username, hashedPassword, salt]
        );
        console.log("Heres the rows for the user", rows);
        const user = { id: rows[0].id, username: username };
        console.log("Heres the user", user);

        req.login(user, function (err) {
          if (err) {
            return next(err);
          }
          res.redirect("/");
        });
      } catch (err) {
        throw err;
      }
    }
  );
});
app.get("/login", (req, res) => res.render("login"));
// app.post("/login/password", async (req, res, next) => {
//   const { username, password } = req.body;
//   try {
//     const { rows } = await pool.query(
//       `SELECT * FROM users WHERE username LIKE $1`,
//       [username]
//     );
//     if (!rows) {
//       cb(null, false, { message: "Incorrect username or password" });
//     }
//     console.log("here's the rows line 129:", rows);
//     crypto.pbkdf2(
//       password,
//       rows[0].salt,
//       310000,
//       32,
//       "sha256",
//       function (err, hashedPassword) {
//         // console.log("rows line 137", rows[0].hashed_password);
//         if (err) {
//           next(err);
//         }
//         if (
//           !crypto.timingSafeEqual(rows[0].hashed_password == hashedPassword)
//         ) {
//           cb(null, false, { message: "Incorrect usernanme or password" });
//         }
//         req.login(user, (err) => {
//           if (err) {
//             next(err);
//           }
//         });
//         res.redirect("/");
//       }
//     );
//   } catch (err) {
//     if (err) {
//       next(err);
//     }
//   }
// });

// app.use((err, req, res, next) => {
//   req.locals.message = err.message;
//   req.locals.error = req.app.get("env") === "development" ? err : {};

//   res.status(err.status || 500);

//   res.render("error");
// });
app.post(
  "/login/password",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
  })
);

app.listen(3000, () => console.log("app listening on port 3000!"));
