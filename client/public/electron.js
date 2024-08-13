const { app, BrowserWindow } = require("electron");
const path = require("path");
const isDev = !app.isPackaged;

const PORT = 8000;

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  const url = isDev
    ? `http://localhost:3000`
    : `file://${path.join(__dirname, "../build/index.html")}`;

  win.loadURL(url);

  if (isDev) {
    win.webContents.openDevTools();
  }

  // Pass the port to the renderer process
  win.webContents.on("did-finish-load", () => {
    win.webContents.send("app-port", PORT);
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
