const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const http = require("http");

let mainWindow = null;
let pythonProcess = null;

const BACKEND_PORT = 8000;
const FRONTEND_URL = process.env.ELECTRON_START_URL || "http://localhost:5173";

function startPythonBackend() {
  const isWin = process.platform === "win32";
  const pythonExecutable = isWin
    ? path.join(__dirname, "..", "backend", ".venv", "Scripts", "python.exe")
    : path.join(__dirname, "..", "backend", ".venv", "bin", "python");

  const cwd = path.join(__dirname, "..", "backend");

  pythonProcess = spawn(
    pythonExecutable,
    ["-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", `${BACKEND_PORT}`],
    { cwd, stdio: "pipe" }
  );

  pythonProcess.stdout.on("data", (data) => {
    console.log(`[Python Backend] ${data}`);
  });

  pythonProcess.stderr.on("data", (data) => {
    console.error(`[Python Backend Error] ${data}`);
  });

  pythonProcess.on("close", (code) => {
    console.log(`Python backend exited with code ${code}`);
  });
}

function stopPythonBackend() {
  if (pythonProcess) {
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", pythonProcess.pid, "/f", "/t"]);
    } else {
      pythonProcess.kill("SIGINT");
    }
    pythonProcess = null;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "School Management System",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(FRONTEND_URL);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  ipcMain.handle("get-app-version", () => app.getVersion());

  // Start FastAPI backend subprocess
  startPythonBackend();

  // Give backend 1.5 seconds to bind before loading window
  setTimeout(createWindow, 1500);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    stopPythonBackend();
    app.quit();
  }
});

app.on("will-quit", () => {
  stopPythonBackend();
});
