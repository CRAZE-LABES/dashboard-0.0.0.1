# CrazeDash

CrazeDash is a Skyport-inspired dashboard client for managing Minecraft servers.
- **User Authentication:** Discord OAuth and local username/password.
- **Server Management:** Create servers through the Skyport Application API.
- **Admin Panel:** Manage users (create members/admins).
- **Single Panel:** "Go to Panel" button to access your Skyport backend panel.
- **Real-time Console:** Demo console and server status with Socket.io.
- **Customization:** All branding/colors/URLs in `.env`.

---

## Setup

1. **Clone & Install:**
   ```bash
   git clone https://github.com/YourUser/craze-dash.git
   cd craze-dash
   npm install
   ```

2. **Environment Variables:**
   ```bash
   cp .env_example .env
   # Edit .env with your credentials (Discord, MongoDB, PANEL_URL, etc)
   ```

3. **Run the App:**
   ```bash
   npm start
   ```

4. **Visit:**  
   [http://localhost:3000](http://localhost:3000)

---

## File Structure

```
craze-dash/
├── app.js                # Main server
├── db.js                 # MongoDB connection
├── package.json          # Project metadata
├── .env_example          # Example environment file
├── .gitignore            # Git ignore rules
├── models/
│   └── User.js           # User schema
├── public/
│   └── styles.css        # Global styles
├── views/
│   ├── login.ejs         # Login page
│   ├── dashboard.ejs     # Main dashboard
│   └── admin.ejs         # Admin panel
└── README.md
```

---

## Admin: Create Users

From the Admin Panel, admins can create new users as **members** or **admins**.

---

## Panel Link

All users see a "Go to Panel" button that links to your Skyport panel (set in `.env` as `PANEL_URL`).

---

## Server Creation

Fill out the "Create Server" form; this will POST to your Skyport Application API.

---

## Customization

Edit `.env` to change dashboard name, subtitle, favicon, UI colors, background, etc.

---

## License

MIT
