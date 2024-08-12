const { app, BrowserWindow } = require("electron");
const path = require("path");
const isDev = app.isPackaged ? false : require("electron-is-dev");
let port = process.env.PORT || 3000;

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
    },
  });

  win.loadURL(
    isDev
      ? `http://localhost:${process.env.PORT || 3000}`
      : `file://${path.join(__dirname, "../build/index.html")}`
  );
}
const userDataPath = path.join(
  app.getPath("userData"),
  `instance_${process.env.PORT || 3000}`
);

app.setPath("userData", userDataPath);
app.whenReady().then(() => createWindow(process.env.PORT || 3000));

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
