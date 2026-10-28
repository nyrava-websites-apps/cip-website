# Grupo CIP / SeBa local website

This repository contains the restored Grupo CIP website, a local Node backend, and a SQL Server setup script.

## Run on Windows

1. Open SQL Server Management Studio and connect to:

```
localhost\\SQLEXPRESS
```

2. Open `db/001-create-cipsite.sql` from this repository and click **Execute**. This creates the local `CIPSite` database and the `ContactMessages` table.

3. Open PowerShell in the folder that contains `package.json`. If the ZIP was extracted into a nested folder, use:

```powershell
Set-Location "$env:USERPROFILE\Downloads\cip-website-fixed\cip-website-main"
```

4. Install dependencies. Use `npm.cmd` because some Windows PowerShell policies block `npm.ps1`:

```powershell
& "$env:ProgramFiles\nodejs\npm.cmd" install
```

5. Start the local website:

```powershell
$env:PORT=4174
& "$env:ProgramFiles\nodejs\npm.cmd" start
```

6. Open:

```
http://localhost:4174
```

The database connection check is:

```
http://localhost:4174/api/health
```

A successful response reports `"ok":true`.

Keep the PowerShell window running while using the site. Stop it with **Ctrl+C**.

## What this package contains

- Static Grupo CIP website pages and assets
- `server.js` local backend
- SQL Server schema in `db/001-create-cipsite.sql`
- Contact form endpoint at `POST /api/contact`
- Local rendering fallback for missing snapshot assets

This is a replacement local backend. The original production backend and production database were not included in the public website snapshot.
