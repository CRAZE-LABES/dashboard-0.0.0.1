require("dotenv").config();
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const DiscordStrategy = require("passport-discord").Strategy;
const LocalStrategy = require("passport-local").Strategy;
const mongoose = require("mongoose");
const flash = require("connect-flash");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
const fetch = require("node-fetch");
const User = require("./models/User");
const connectDB = require("./db");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Connect to MongoDB
connectDB();

// Session
app.use(
  session({
    secret: process.env.SESSION_SECRET || "craze-session",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Static files
app.use(express.static("public"));

// Passport serialization
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user || false);
  } catch (e) {
    done(e, false);
  }
});

// Local strategy
passport.use(
  new LocalStrategy(
    { usernameField: "username" },
    async (username, password, done) => {
      try {
        const user = await User.findOne({ username });
        if (!user || !(await user.comparePassword(password)))
          return done(null, false, { message: "Invalid credentials" });
        return done(null, user);
      } catch (e) {
        return done(e);
      }
    }
  )
);

// Discord OAuth strategy
passport.use(
  new DiscordStrategy(
    {
      clientID: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      callbackURL: process.env.DISCORD_CALLBACK_URL,
      scope: ["identify"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ discordId: profile.id });
        if (!user) {
          user = new User({
            username: profile.username,
            discordId: profile.id,
            discordCredits: Math.floor(Math.random() * 100),
            isAdmin: false,
          });
          await user.save();
        }
        return done(null, user);
      } catch (e) {
        return done(e, null);
      }
    }
  )
);

// Auth middleware
function ensureAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect("/login");
}
function ensureAdmin(req, res, next) {
  if (req.user && req.user.isAdmin) return next();
  res.status(403).send("Forbidden");
}

// Routes

app.get("/", ensureAuth, (req, res) => {
  res.redirect("/dashboard");
});

app.get("/login", (req, res) => {
  res.render("login", {
    dashName: process.env.DASH_NAME || "CrazeDash",
    dashSubtitle: process.env.DASH_SUBTITLE || "",
    faviconUrl: process.env.FAVICON_URL || "",
    background: process.env.BACKGROUND_ANIMATION_URL,
    flash: req.flash("error"),
    panelUrl: process.env.PANEL_URL
  });
});

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/dashboard",
    failureRedirect: "/login",
    failureFlash: true,
  })
);

app.get("/logout", (req, res) => {
  req.logout(() => {
    res.redirect("/login");
  });
});

// Discord OAuth
app.get("/auth/discord", passport.authenticate("discord"));
app.get(
  "/auth/discord/callback",
  passport.authenticate("discord", { failureRedirect: "/login" }),
  (req, res) => res.redirect("/dashboard")
);

// Dashboard
app.get("/dashboard", ensureAuth, (req, res) => {
  res.render("dashboard", {
    user: req.user,
    dashName: process.env.DASH_NAME || "CrazeDash",
    dashSubtitle: process.env.DASH_SUBTITLE || "",
    faviconUrl: process.env.FAVICON_URL || "",
    primaryColor: process.env.PRIMARY_COLOR || "#1abc9c",
    secondaryColor: process.env.SECONDARY_COLOR || "#2c3e50",
    background: process.env.BACKGROUND_ANIMATION_URL,
    panelUrl: process.env.PANEL_URL
  });
});

// Admin panel for user management
app.get("/admin", ensureAuth, ensureAdmin, async (req, res) => {
  const users = await User.find();
  res.render("admin", {
    users,
    dashName: process.env.DASH_NAME || "CrazeDash",
    dashSubtitle: process.env.DASH_SUBTITLE || "",
    faviconUrl: process.env.FAVICON_URL || "",
    primaryColor: process.env.PRIMARY_COLOR || "#1abc9c",
    secondaryColor: process.env.SECONDARY_COLOR || "#2c3e50",
    background: process.env.BACKGROUND_ANIMATION_URL,
    panelUrl: process.env.PANEL_URL
  });
});

// Admin: Create user (members/admins)
app.post("/admin/create-user", ensureAuth, ensureAdmin, async (req, res) => {
  const { username, password, isAdmin } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Missing fields" });
  try {
    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ error: "User already exists" });
    const user = new User({ username, password, isAdmin: isAdmin === "on" || isAdmin === true });
    await user.save();
    res.json({ success: true, user: { username: user.username, isAdmin: user.isAdmin } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Server creation via Skyport Application API
app.post("/api/servers", ensureAuth, async (req, res) => {
  const { serverName, serverType } = req.body;
  try {
    // Demo: Call to Skyport API, adapt as needed for your actual API!
    const skyportRes = await fetch(`${process.env.PANEL_URL}/api/createServer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SKYPORT_API_KEY}`
      },
      body: JSON.stringify({
        name: serverName,
        type: serverType,
        creator: req.user.username
      })
    });
    const data = await skyportRes.json();
    if (!data.success) throw new Error(data.error || "Skyport API error");
    res.json({ success: true, serverId: data.serverId });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Socket.io: Demo real-time updates (stub)
io.on("connection", (socket) => {
  socket.emit("servers", [
    { id: "srv1", name: "Survival Server", status: "online" },
    { id: "srv2", name: "Creative Server", status: "offline" },
  ]);
  setInterval(() => {
    socket.emit("statusUpdate", {
      id: "srv1",
      status: Math.random() > 0.5 ? "online" : "offline",
    });
  }, 3000);

  socket.on("joinConsole", (srvId) => {
    setInterval(() => {
      socket.emit("consoleLog", {
        srvId,
        line: "[Server] Demo log line at " + new Date().toLocaleTimeString(),
      });
    }, 1000);
  });
  socket.on("consoleCmd", (data) => {
    socket.emit("consoleLog", {
      srvId: data.srvId,
      line: `[You]: ${data.command}`,
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`CrazeDash running on port ${PORT}`);
});
