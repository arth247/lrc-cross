# LRC Cross Angular Project

This project is an **Angular application** that visualizes the LRC Cross strategy using **Lightweight Charts v4** and Bybit market data.  

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd <project-folder>
```

Replace `<your-repo-url>` with the actual GitHub or GitLab repository link.  

---

### 2. Install Dependencies
Make sure you have **Node.js (>=18.x)** and **npm (>=9.x)** installed.  
Then install project dependencies:
```bash
npm install
```

---

### 3. Run the Application
Start the Angular development server:
```bash
ng serve
```

The app will be available at:  
👉 http://localhost:4200  

---

### 4. Build for Production
To build an optimized version:
```bash
ng build --configuration production
```
The compiled files will be located in the **`dist/`** folder.  

---

## 📂 Project Structure
```
src/
 ├── app/                  # Main Angular components & services
 │    ├── chart/           # LRC chart component
 │    ├── data.service.ts  # Data fetching (Bybit)
 │    └── app.module.ts    # App module
 ├── assets/               # Static files (icons, configs, etc.)
 ├── environments/         # Environment configs
 └── index.html            # App entry point
```

---

## ⚡ Features
- LRC Cross visualization  
- Bybit market data fetching  
- Lightweight Charts v4 integration  
- Extendable for signals, statistics, and strategy research  

---

## 🛠 Useful Commands
- `ng serve` → Run dev server  
- `ng build` → Build production bundle  
- `ng test` → Run unit tests  
- `ng lint` → Check code style  

---

## 📌 Requirements
- Node.js 18+  
- npm 9+  
- Angular CLI (install globally if not already installed):  
  ```bash
  npm install -g @angular/cli
  ```
