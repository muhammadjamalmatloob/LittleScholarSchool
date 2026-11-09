const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const http = require("http");

let mainWindow = null;
let pythonProcess = null;

const BACKEND_PORT = 8000;

function getBackendExecutable() {
  if (app.isPackaged) {
    const inExtra = path.join(process.resourcesPath, "api-server", "api-server.exe");
    if (fs.existsSync(inExtra)) return inExtra;
    const directExtra = path.join(process.resourcesPath, "api-server.exe");
    if (fs.existsSync(directExtra)) return directExtra;
    return inExtra;
  }

  const venvWin = path.join(__dirname, "..", "backend", ".venv", "Scripts", "python.exe");
  if (fs.existsSync(venvWin)) return venvWin;
  return process.platform === "win32" ? "python.exe" : "python3";
}

function ensureDatabase() {
  const userDataPath = app.getPath("userData");
  const targetDb = path.join(userDataPath, "school_data.db");

  if (!fs.existsSync(targetDb)) {
    const seedDbPath = app.isPackaged
      ? path.join(process.resourcesPath, "school_data.db")
      : path.join(__dirname, "..", "backend", "school_data.db");

    if (fs.existsSync(seedDbPath)) {
      try {
        fs.copyFileSync(seedDbPath, targetDb);
        console.log("Copied initial database to:", targetDb);
      } catch (err) {
        console.error("Failed to copy initial database:", err);
      }
    }
  }

  return targetDb;
}

function startPythonBackend() {
  if (app.isPackaged && process.platform === "win32") {
    try {
      require("child_process").execSync("taskkill /im api-server.exe /f /t", { stdio: "ignore" });
    } catch (e) {}
  }
  const exe = getBackendExecutable();
  const dbPath = ensureDatabase();

  const env = {
    ...process.env,
    DATABASE_PATH: dbPath,
    ENVIRONMENT: app.isPackaged ? "production" : "development",
  };

  if (app.isPackaged) {
    const cwd = path.join(process.resourcesPath, "api-server");
    const logPath = path.join(app.getPath("userData"), "backend_server.log");
    let logFd = "ignore";
    try {
      logFd = fs.openSync(logPath, "a");
    } catch (e) {
      console.error("Could not open backend log file:", e);
    }
    console.log(`Starting packaged backend: ${exe} in ${cwd}`);
    pythonProcess = spawn(exe, [], {
      cwd: fs.existsSync(cwd) ? cwd : process.resourcesPath,
      env,
      stdio: ["ignore", logFd, logFd],
      windowsHide: true,
    });
  } else {
    const cwd = path.join(__dirname, "..", "backend");
    console.log(`Starting dev backend: ${exe} in ${cwd}`);
    pythonProcess = spawn(
      exe,
      ["-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", `${BACKEND_PORT}`],
      {
        cwd,
        env,
        stdio: "pipe",
        windowsHide: false,
      }
    );

    if (pythonProcess.stdout) {
      pythonProcess.stdout.on("data", (d) => console.log(`[Python] ${d}`));
    }
    if (pythonProcess.stderr) {
      pythonProcess.stderr.on("data", (d) => console.error(`[Python Err] ${d}`));
    }
  }

  if (pythonProcess) {
    pythonProcess.on("close", (code) => {
      console.log(`Python backend exited with code ${code}`);
    });
  }
}

function stopPythonBackend() {
  if (pythonProcess) {
    try {
      if (process.platform === "win32") {
        spawn("taskkill", ["/pid", pythonProcess.pid, "/f", "/t"]);
      } else {
        pythonProcess.kill("SIGINT");
      }
    } catch (e) {
      console.error("Error stopping python backend:", e);
    }
    pythonProcess = null;
  }
  if (app.isPackaged && process.platform === "win32") {
    try {
      spawn("taskkill", ["/im", "api-server.exe", "/f", "/t"]);
    } catch (e) {}
  }
}

function waitForBackend(callback, retries = 60) {
  const req = http.get(`http://127.0.0.1:${BACKEND_PORT}/api/health`, (res) => {
    if (res.statusCode === 200) {
      callback();
    } else {
      retry();
    }
  });

  function retry() {
    if (retries > 0) {
      setTimeout(() => waitForBackend(callback, retries - 1), 500);
    } else {
      console.warn("Backend health check timed out, launching window anyway...");
      callback();
    }
  }

  req.on("error", () => {
    retry();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 650,
    title: "Little Scholar School System",
    icon: path.join(__dirname, "..", "app_icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const devUrl = process.env.ELECTRON_START_URL;
  if (!app.isPackaged && devUrl) {
    mainWindow.loadURL(devUrl);
  } else {
    const distPath = path.join(__dirname, "dist", "index.html");
    const fallbackPath = path.join(__dirname, "..", "frontend", "dist", "index.html");

    if (fs.existsSync(distPath)) {
      mainWindow.loadFile(distPath);
    } else if (fs.existsSync(fallbackPath)) {
      mainWindow.loadFile(fallbackPath);
    } else {
      mainWindow.loadURL(`http://localhost:5173`);
    }
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  ipcMain.handle("get-app-version", () => app.getVersion());

  startPythonBackend();

  waitForBackend(() => {
    createWindow();
  });

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
