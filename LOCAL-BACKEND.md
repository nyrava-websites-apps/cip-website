# Run Grupo CIP locally with SQL Server

This adds a replacement local backend for the restored static site. It does not recover the original production backend or database.

1. In SSMS, open and execute db/001-create-cipsite.sql.
2. In PowerShell, from this repository folder, run:
   npm install
   npm start
3. Open http://localhost:4173
4. Check the database connection at http://localhost:4173/api/health

The backend uses Windows authentication against localhost\\SQLEXPRESS and the CIPSite database. Override SQL_SERVER, SQL_DATABASE, or PORT if needed.
