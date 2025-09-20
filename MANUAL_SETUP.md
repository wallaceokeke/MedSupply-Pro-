# 🚨 Manual Setup Guide (If Scripts Fail)

If you're getting errors, follow these steps **one by one**:

## Step 1: Check Prerequisites

### Check Python
```bash
python --version
```
**Should show Python 3.8 or higher**

### Check Node.js
```bash
node --version
```
**Should show Node.js 16 or higher**

### Check npm
```bash
npm --version
```
**Should show npm 8 or higher**

## Step 2: Backend Setup

```bash
# Navigate to backend folder
cd backend

# Install Python dependencies
pip install -r requirements.txt

# If pip fails, try:
pip install --upgrade pip
pip install -r requirements.txt

# Initialize database
python app.py initdb

# Start backend server
python app.py run
```

**Keep this terminal open!** The backend should show:
```
* Running on http://127.0.0.1:5000
```

## Step 3: Frontend Setup (New Terminal)

```bash
# Navigate to frontend folder
cd frontend

# Install Node.js dependencies
npm install

# If npm fails, try:
npm cache clean --force
npm install

# Start frontend server
npm start
```

**Keep this terminal open too!** The frontend should show:
```
Local:            http://localhost:3000
```

## Step 4: Access the Platform

Open your browser and go to: **http://localhost:3000**

## Common Error Fixes

### Python Errors
```bash
# If "python" not found, try:
py --version
py app.py initdb
py app.py run
```

### Node.js Errors
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules
npm install
```

### Port Already in Use
```bash
# Kill processes on ports 3000 and 5000
# Windows:
netstat -ano | findstr :3000
netstat -ano | findstr :5000
taskkill /PID <PID_NUMBER> /F

# Mac/Linux:
lsof -ti:3000 | xargs kill
lsof -ti:5000 | xargs kill
```

### Database Errors
```bash
# Delete the database file and recreate
cd backend
del medical_mvp.db
python app.py initdb
```

## Test Login

Once both servers are running:

1. Go to http://localhost:3000
2. Click "Sign Up" or use existing accounts:
   - **Facility**: `facility@example.com` / `facpass`
   - **Vendor**: `vendor@example.com` / `vendorpass`

## Still Having Issues?

**Tell me the exact error message** and I'll help you fix it!

Common issues:
- Missing Python/Node.js
- Port conflicts
- Permission issues
- Network/firewall blocking
- Missing dependencies
